/**
 * Ticket-application validation. Pure JS, dependency-free.
 * THIS FILE EXISTS IN TWO IDENTICAL COPIES: frontend/src/lib/ and backend/src/lib/.
 * The browser uses it for instant feedback; the backend uses it as the real gatekeeper.
 * (`npm run check:sync` in the backend verifies the copies match.)
 * Every validator returns an error CODE or null; codes map to i18n keys `apply.errors.*`.
 */
export const AIRPORTS = ['KBL', 'HEA', 'MZR', 'DXB', 'IST', 'DEL']; // fictional demo network (see data/routes.js)
export const TRIP_TYPES = ['one_way', 'return'];
export const MAX_PASSENGERS = 9;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
const DOC_RE = /^[A-Za-z0-9-]{5,20}$/;
const KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const squash = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');

/** Parse YYYY-MM-DD as a real calendar date (rejects 2025-02-31). Returns a UTC ms value or null. */
export function parseDate(v) {
  if (!DATE_RE.test(String(v))) return null;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt.getTime() : null;
}
export const todayISO = (now = new Date()) => now.toISOString().slice(0, 10);

/**
 * Validates + normalises raw input.
 * Returns { errors: {field: code}, value: cleanedObject }. `value` contains ONLY known fields,
 * so unexpected properties (user_id, status, reference, ...) are dropped by construction.
 */
export function validateApplication(input, now = new Date()) {
  const i = input && typeof input === 'object' ? input : {};
  const errors = {};
  const today = parseDate(todayISO(now));

  const fullName = squash(i.fullName);
  if (fullName.length < 2) errors.fullName = 'nameShort';
  else if (fullName.length > 100) errors.fullName = 'nameLong';

  const dobMs = parseDate(i.dateOfBirth);
  if (!i.dateOfBirth) errors.dateOfBirth = 'required';
  else if (dobMs === null) errors.dateOfBirth = 'dateInvalid';
  else if (dobMs >= today) errors.dateOfBirth = 'dobFuture';
  else if (today - dobMs > 120 * 366 * 86400000) errors.dateOfBirth = 'dobOld';

  const nationality = squash(i.nationality);
  if (nationality.length < 2) errors.nationality = 'required';
  else if (nationality.length > 60) errors.nationality = 'tooLong';

  const email = String(i.email ?? '').trim().toLowerCase();
  if (!email) errors.email = 'emailRequired';
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = 'emailInvalid';

  const phone = squash(i.phone);
  if (phone && !PHONE_RE.test(phone)) errors.phone = 'phoneInvalid';

  const idDocumentNumber = String(i.idDocumentNumber ?? '').trim();
  if (idDocumentNumber && !DOC_RE.test(idDocumentNumber)) errors.idDocumentNumber = 'docInvalid';

  if (!AIRPORTS.includes(i.origin)) errors.origin = 'required';
  if (!AIRPORTS.includes(i.destination)) errors.destination = 'required';
  else if (i.origin === i.destination) errors.destination = 'sameAirport';

  const tripType = i.tripType;
  if (!TRIP_TYPES.includes(tripType)) errors.tripType = 'required';

  const departMs = parseDate(i.departDate);
  if (!i.departDate) errors.departDate = 'required';
  else if (departMs === null) errors.departDate = 'dateInvalid';
  else if (departMs < today) errors.departDate = 'datePast';

  let returnDate = null;
  if (tripType === 'return') {
    const retMs = parseDate(i.returnDate);
    if (!i.returnDate) errors.returnDate = 'required';
    else if (retMs === null) errors.returnDate = 'dateInvalid';
    else if (departMs !== null && retMs < departMs) errors.returnDate = 'returnBeforeDepart';
    else returnDate = i.returnDate;
  }

  const passengers = Number(i.passengers);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > MAX_PASSENGERS) errors.passengers = 'passengersRange';

  if (i.consent !== true) errors.consent = 'consentRequired';

  if (!KEY_RE.test(String(i.idempotencyKey ?? ''))) errors.idempotencyKey = 'badKey';

  return {
    errors,
    value: {
      fullName, dateOfBirth: i.dateOfBirth, nationality, email,
      phone: phone || null, idDocumentNumber: idDocumentNumber || null,
      origin: i.origin, destination: i.destination, tripType, departDate: i.departDate,
      returnDate, passengers, consent: i.consent === true, idempotencyKey: String(i.idempotencyKey ?? '')
    }
  };
}
