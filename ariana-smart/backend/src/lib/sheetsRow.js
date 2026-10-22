/**
 * Fields exported to Google Sheets.
 * Keep the original columns A-K in the same order.
 */
export const SHEET_HEADERS = [
  "Reference",
  "Submitted (UTC)",
  "Status",
  "Origin",
  "Destination",
  "Trip type",
  "Departure date",
  "Return date",
  "Passengers",
  "Nationality",
  "Synced at (UTC)",
  "Full Name",
  "Date of Birth",
  "Email",
  "Phone",
  "ID Document Number",
];

export const SHEET_FIELDS = [
  "reference",
  "created_at",
  "status",
  "origin",
  "destination",
  "trip_type",
  "depart_date",
  "return_date",
  "passengers",
  "nationality",
];

const PERSONAL_FIELDS = [
  "full_name",
  "date_of_birth",
  "email",
  "phone",
  "id_document_number",
];

/** Prevent spreadsheet formula injection. */
export function safeCell(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;

  const s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function toSheetRow(app, now = new Date()) {
  const originalFields = SHEET_FIELDS.map((field) => safeCell(app?.[field]));

  const syncedAt = now.toISOString();

  const personalFields = PERSONAL_FIELDS.map((field) => safeCell(app?.[field]));

  return [...originalFields, syncedAt, ...personalFields];
}
