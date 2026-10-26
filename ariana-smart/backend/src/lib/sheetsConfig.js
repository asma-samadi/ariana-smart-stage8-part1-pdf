/**
 * Google Sheets runtime configuration. Pure function of an env object (easy to test).
 * Credentials are parsed IN MEMORY only. They are never logged, never returned to callers of
 * describeSheetsConfig(), and never sent to the browser.
 */
const SHEET_ID_RE = /^[A-Za-z0-9_-]{20,100}$/;
const TAB_RE = /^[A-Za-z0-9 _-]{1,50}$/;

export function loadSheetsConfig(env = process.env) {
  const off = (reason) => ({ enabled: false, reason });
  if (String(env.GOOGLE_SHEETS_ENABLED ?? '').toLowerCase() === 'false') return off('disabled_by_flag');
  const sheetId = String(env.GOOGLE_SHEETS_ID ?? '').trim();
  const b64 = String(env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ?? '').trim();
  if (!sheetId && !b64) return off('not_configured');
  if (!sheetId || !b64) return off('incomplete');
  if (!SHEET_ID_RE.test(sheetId)) return off('bad_sheet_id'); // e.g. a full URL was pasted
  const tab = String(env.GOOGLE_SHEETS_TAB ?? 'Applications').trim();
  if (!TAB_RE.test(tab)) return off('bad_tab_name');

  let creds;
  try {
    creds = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch {
    return off('bad_credentials_encoding'); // deliberately no detail: the error text could echo secret content
  }
  if (!creds || creds.type !== 'service_account' || typeof creds.client_email !== 'string' || typeof creds.private_key !== 'string') {
    return off('bad_credentials_shape');
  }
  return {
    enabled: true,
    sheetId,
    tab,
    credentials: { client_email: creds.client_email, private_key: creds.private_key.replace(/\\n/g, '\n') }
  };
}

/** Safe summary for health/admin endpoints: booleans and a reason code only. */
export function describeSheetsConfig(cfg) {
  return cfg.enabled ? { configured: true } : { configured: false, reason: cfg.reason };
}
