import { SHEET_HEADERS } from './sheetsRow.js';
import { SheetsError } from './sheetsErrors.js';

const lastCol = String.fromCharCode(64 + SHEET_HEADERS.length); // A..K
const q = (tab) => `'${tab.replace(/'/g, "''")}'`;

/**
 * Thin, testable wrapper. `api` has the shape of googleapis `sheets.spreadsheets`
 * ({ values: { get, update, append } }), so tests inject a fake and production injects the real one.
 */
export function createSheetsClient({ config, api }) {
  const id = config.sheetId;
  const tab = q(config.tab);
  let headerOk = false;

  async function ensureHeader() {
    if (headerOk) return;
    const res = await api.values.get({ spreadsheetId: id, range: `${tab}!A1:${lastCol}1` });
    const row = res?.data?.values?.[0];
    if (!row || row.length === 0) {
      await api.values.update({
        spreadsheetId: id, range: `${tab}!A1:${lastCol}1`, valueInputOption: 'RAW',
        requestBody: { values: [SHEET_HEADERS] }
      });
    } } else {
  const oldHeaders = SHEET_HEADERS.slice(0, 11);

  const oldHeadersMatch = oldHeaders.every(
    (header, i) => row[i] === header
  );

  const extraHeadersEmpty = row
    .slice(oldHeaders.length)
    .every((header) => !header);

  if (oldHeadersMatch && extraHeadersEmpty) {
    await api.values.update({
      spreadsheetId: id,
      range: `${tab}!A1:${lastCol}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [SHEET_HEADERS] }
    });
  } else if (SHEET_HEADERS.some((header, i) => row[i] !== header)) {
    throw new SheetsError('header_mismatch');
  }
}
    headerOk = true;
  }

  /** Duplicate guard #2: is this reference already in column A of the sheet? */
  async function hasReference(reference) {
    await ensureHeader();
    const res = await api.values.get({ spreadsheetId: id, range: `${tab}!A:A` });
    return (res?.data?.values ?? []).some((r) => r[0] === reference);
  }

  async function appendRow(values) {
    await ensureHeader();
    await api.values.append({
      spreadsheetId: id, range: `${tab}!A:${lastCol}`,
      valueInputOption: 'RAW',            // text is stored literally, formulas are never evaluated
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] }
    });
  }
  return { ensureHeader, hasReference, appendRow };
}

/** Real Google API. Loaded lazily so tests and un-configured deployments never need googleapis. */
export async function createGoogleApi(config) {
  const { google } = await import('googleapis');
  const auth = new google.auth.JWT({
    email: config.credentials.client_email,
    key: config.credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth, timeout: 15000 }).spreadsheets;
}
