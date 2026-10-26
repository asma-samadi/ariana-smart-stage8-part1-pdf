/**
 * Error classification. We NEVER keep or log the raw error message from Google/network: it can
 * contain request details. Only a short code from this fixed list is stored and logged.
 */
export class SheetsError extends Error {
  constructor(code, transient = false) { super(code); this.name = 'SheetsError'; this.code = code; this.transient = transient; }
}
const NETWORK = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND', 'EPIPE', 'ESOCKETTIMEDOUT']);

export function classifySheetsError(err) {
  if (err instanceof SheetsError) return { code: err.code, transient: err.transient };
  const status = Number(err?.response?.status ?? err?.status ?? (Number.isInteger(err?.code) ? err.code : NaN));
  if (status === 429) return { code: 'rate_limited', transient: true };
  if (status >= 500 && status <= 599) return { code: 'google_server_error', transient: true };
  if (NETWORK.has(String(err?.code))) return { code: 'network_error', transient: true };
  if (status === 401) return { code: 'auth_failed', transient: false };
  if (status === 403) return { code: 'permission_denied', transient: false }; // sheet not shared with the service account, or API disabled
  if (status === 404) return { code: 'sheet_not_found', transient: false };
  if (status >= 400 && status <= 499) return { code: 'bad_request', transient: false };
  return { code: 'unknown_error', transient: false };
}
