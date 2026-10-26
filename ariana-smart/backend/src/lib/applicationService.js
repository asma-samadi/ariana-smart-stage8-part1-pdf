import { validateApplication } from './applicationRules.js';

const OPEN_STATUSES = ['submitted', 'under_review', 'documents_required'];

/**
 * Creates an application on behalf of an ALREADY VERIFIED user.
 * Security rules enforced here (never taken from the request body):
 *   - user_id  = verified token user (userId argument)
 *   - status   = 'submitted'
 *   - reference, created_at, sheet_sync_status = database defaults
 * `admin` is the service-role Supabase client (RLS bypass), so ownership checks live in this code.
 * Returns { status: HTTP-ish code, body }.
 */
export async function createApplication({ admin, userId, input, now = new Date(), onCreated = null }) {
  const { errors, value } = validateApplication(input, now);
  if (Object.keys(errors).length) return { status: 400, body: { error: 'validation_failed', fields: errors } };

  const cols = 'id, reference, status, created_at';

  // 1) Idempotent retry: same user + same key returns the original application (no second row).
  const existing = await admin.from('applications').select(cols).eq('user_id', userId).eq('idempotency_key', value.idempotencyKey).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { status: 200, body: { application: existing.data, duplicate: true } };

  // 2) Same person, same route and date already open -> refuse a second identical application.
  const dup = await admin.from('applications').select('id, reference').eq('user_id', userId)
    .eq('full_name', value.fullName).eq('origin', value.origin).eq('destination', value.destination)
    .eq('depart_date', value.departDate).in('status', OPEN_STATUSES).limit(1);
  if (dup.error) throw dup.error;
  if (dup.data?.length) return { status: 409, body: { error: 'duplicate_application', reference: dup.data[0].reference } };

  const ins = await admin.from('applications').insert({
    user_id: userId,
    status: 'submitted',
    full_name: value.fullName,
    date_of_birth: value.dateOfBirth,
    nationality: value.nationality,
    email: value.email,
    phone: value.phone,
    id_document_number: value.idDocumentNumber,
    origin: value.origin,
    destination: value.destination,
    trip_type: value.tripType,
    depart_date: value.departDate,
    return_date: value.returnDate,
    passengers: value.passengers,
    consent_accepted: true,
    idempotency_key: value.idempotencyKey
  }).select(cols).single();

  if (ins.error) {
    // Lost a race with a concurrent identical request: the unique (user_id, idempotency_key) fired.
    if (ins.error.code === '23505') {
      const again = await admin.from('applications').select(cols).eq('user_id', userId).eq('idempotency_key', value.idempotencyKey).maybeSingle();
      if (again.data) return { status: 200, body: { application: again.data, duplicate: true } };
    }
    throw ins.error;
  }
  // Only a brand-new row triggers the (optional) Sheets sync hook. Replays (200) and duplicates (409) never do.
  // The hook only receives the id, runs after the row is saved, and can never fail or delay the user's request.
  if (typeof onCreated === 'function') { try { onCreated(ins.data.id); } catch { /* ignore */ } }
  return { status: 201, body: { application: ins.data, duplicate: false } };
}


/** Loads only non-sensitive summary fields for a PDF and enforces ownership in the query. */
export async function getApplicationPdfSummary({ admin, userId, applicationId }) {
  if (!userId || !applicationId) return { status: 404, body: { error: 'not_found' } };
  const result = await admin.from('applications')
    .select('id, reference, status, origin, destination, trip_type, depart_date, return_date, passengers, created_at')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return { status: 404, body: { error: 'not_found' } };
  return { status: 200, application: result.data };
}
