import { toSheetRow } from './sheetsRow.js';
import { classifySheetsError } from './sheetsErrors.js';
import { isUuid } from './documentRules.js';

export const SYNCABLE = ['pending', 'failed', 'disabled'];
export const MAX_BATCH = 50;
const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Retries ONLY transient errors, with exponential backoff. Permanent errors fail at once. */
export async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 500, sleep = realSleep } = {}) {
  let attempt = 0;
  for (;;) {
    attempt++;
    try { return await fn(); } catch (err) {
      const { code, transient } = classifySheetsError(err);
      if (!transient || attempt >= maxAttempts) { const e = new Error(code); e.sheetCode = code; e.attempts = attempt; throw e; }
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}

/**
 * Pushes ONE application to the sheet. Supabase stays the source of truth.
 * Duplicate prevention (three independent layers):
 *   1. DB claim: rpc claim_sheet_sync atomically flips pending/failed/disabled -> syncing for exactly one caller.
 *   2. Sheet check: if the reference is already in column A (e.g. crash after append, before the DB update), do not append again.
 *   3. synced rows are never claimable again.
 * `sheets` is null when Google Sheets is not configured.
 */
export async function syncApplication({ admin, sheets, applicationId, retry = {}, now = () => new Date() }) {
  if (!isUuid(applicationId) && !/^id-\d+$/.test(String(applicationId))) return { result: 'invalid_id' }; // 2nd form: test fakes only
  if (!sheets) {
    await admin.from('applications').update({ sheet_sync_status: 'disabled' }).eq('id', applicationId).eq('sheet_sync_status', 'pending');
    return { result: 'disabled' };
  }
  const claim = await admin.rpc('claim_sheet_sync', { p_id: applicationId });
  if (claim.error) throw claim.error;
  const app = Array.isArray(claim.data) ? claim.data[0] : claim.data;
  if (!app) return { result: 'not_claimed' }; // already synced, or another worker holds it

  try {
    const existed = await withRetry(() => sheets.hasReference(app.reference), retry);
    if (!existed) await withRetry(() => sheets.appendRow(toSheetRow(app, now())), retry);
    await markDone(admin, applicationId, { sheet_sync_status: 'synced', sheet_synced_at: now().toISOString(), sheet_sync_error: null });
    return { result: existed ? 'already_in_sheet' : 'synced' };
  } catch (err) {
    const code = err.sheetCode ?? classifySheetsError(err).code; // fixed codes only: never the raw message
    await markDone(admin, applicationId, { sheet_sync_status: 'failed', sheet_sync_error: code });
    return { result: 'failed', code };
  }
}

async function markDone(admin, id, patch) {
  const r = await admin.from('applications').update(patch).eq('id', id).eq('sheet_sync_status', 'syncing');
  if (r?.error) throw r.error;
}

/** Retry everything that is pending/failed/disabled, one at a time (Sheets write quota is small). */
export async function syncPending({ admin, sheets, limit = 25, retry = {}, now }) {
  const n = Math.max(1, Math.min(Number(limit) || 25, MAX_BATCH));
  const sel = await admin.from('applications').select('id').in('sheet_sync_status', SYNCABLE).order('created_at', { ascending: true }).limit(n);
  if (sel.error) throw sel.error;
  const summary = { attempted: 0, synced: 0, already_in_sheet: 0, failed: 0, skipped: 0 };
  for (const { id } of sel.data ?? []) {
    const r = await syncApplication({ admin, sheets, applicationId: id, retry, now });
    summary.attempted++;
    if (r.result === 'synced') summary.synced++;
    else if (r.result === 'already_in_sheet') summary.already_in_sheet++;
    else if (r.result === 'failed') summary.failed++;
    else summary.skipped++;
    if (r.result === 'failed' && ['auth_failed', 'permission_denied', 'sheet_not_found', 'header_mismatch'].includes(r.code)) break; // config problem: stop hammering
  }
  return summary;
}

export async function syncStatusCounts({ admin }) {
  const r = await admin.from('applications').select('sheet_sync_status').limit(5000);
  if (r.error) throw r.error;
  const counts = { pending: 0, syncing: 0, synced: 0, failed: 0, disabled: 0 };
  for (const row of r.data ?? []) if (row.sheet_sync_status in counts) counts[row.sheet_sync_status]++;
  return counts;
}
