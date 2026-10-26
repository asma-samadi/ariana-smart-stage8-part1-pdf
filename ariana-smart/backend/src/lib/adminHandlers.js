import { syncApplication, syncPending, syncStatusCounts } from './sheetsSync.js';
import { isUuid } from './documentRules.js';

/** Handlers receive all dependencies so they can be tested without express, Supabase or Google. */
export function createAdminHandlers({ getAdmin, getSheets, describe }) {
  const wrap = (fn) => async (req, res, next) => { try { await fn(req, res); } catch (e) { next(e); } };
  return {
    status: wrap(async (_req, res) => {
      res.json({ sheets: describe(), counts: await syncStatusCounts({ admin: getAdmin() }) });
    }),
    syncAll: wrap(async (req, res) => {
      const sheets = await getSheets();
      if (!sheets) return res.status(409).json({ error: 'sheets_not_configured' });
      res.json(await syncPending({ admin: getAdmin(), sheets, limit: req.body?.limit }));
    }),
    syncOne: wrap(async (req, res) => {
      if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Not found' });
      const sheets = await getSheets();
      if (!sheets) return res.status(409).json({ error: 'sheets_not_configured' });
      res.json(await syncApplication({ admin: getAdmin(), sheets, applicationId: req.params.id }));
    })
  };
}
