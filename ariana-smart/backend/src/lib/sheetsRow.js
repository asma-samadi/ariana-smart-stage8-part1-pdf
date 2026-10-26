/**
 * What is allowed to leave Supabase for Google Sheets.
 * ALLOW-LIST ONLY: a column is exported only if it is listed here. Everything else
 * (full name, date of birth, email, phone, id-document number, document files/URLs/paths, user id,
 * tokens, idempotency key) is NOT exported, and is not even selected from the database by the claim function.
 */
export const SHEET_HEADERS = [
  'Reference', 'Submitted (UTC)', 'Status', 'Origin', 'Destination', 'Trip type',
  'Departure date', 'Return date', 'Passengers', 'Nationality', 'Synced at (UTC)'
];
export const SHEET_FIELDS = ['reference', 'created_at', 'status', 'origin', 'destination', 'trip_type', 'depart_date', 'return_date', 'passengers', 'nationality'];

/** Stops spreadsheet formula injection (=, +, -, @, tab, CR at the start of a text cell). */
export function safeCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v;
  const s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function toSheetRow(app, now = new Date()) {
  return [...SHEET_FIELDS.map((f) => safeCell(app?.[f])), now.toISOString()];
}
