import { loadSheetsConfig, describeSheetsConfig } from './sheetsConfig.js';
import { createSheetsClient, createGoogleApi } from './sheetsClient.js';
import { syncApplication } from './sheetsSync.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';

let cfg = null;
let clientPromise = null;
const config = () => (cfg ??= loadSheetsConfig(process.env));

export const sheetsSummary = () => describeSheetsConfig(config());

/** Returns a Sheets client, or null when Sheets is not configured (the app then works without it). */
export function getSheets() {
  const c = config();
  if (!c.enabled) return Promise.resolve(null);
  clientPromise ??= createGoogleApi(c).then((api) => createSheetsClient({ config: c, api })).catch(() => { clientPromise = null; return null; });
  return clientPromise;
}

/** Fire-and-forget after an application is saved. Never throws, never logs payloads, only a result code. */
export function scheduleSync(applicationId) {
  if (String(process.env.SHEETS_SYNC_ON_CREATE ?? 'true').toLowerCase() === 'false') return;
  setImmediate(async () => {
    try {
      const r = await syncApplication({ admin: getSupabaseAdmin(), sheets: await getSheets(), applicationId });
      if (r.result === 'failed') console.error(`sheets sync failed: ${r.code}`);
    } catch { console.error('sheets sync error'); }
  });
}
