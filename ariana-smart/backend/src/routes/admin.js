import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { getSheets, sheetsSummary } from '../lib/sheetsRuntime.js';
import { createAdminHandlers } from '../lib/adminHandlers.js';
import { RATE_LIMITS } from '../lib/rateLimits.js';

const router = Router();
const lim = (o) => rateLimit({ ...o, standardHeaders: true, legacyHeaders: false });
const h = createAdminHandlers({ getAdmin: getSupabaseAdmin, getSheets, describe: sheetsSummary });

// SECURITY: this single line protects EVERY route below. Keep it first. (test/authorization.test.js checks this.)
router.use(lim(RATE_LIMITS.admin), requireAuth, requireAdmin);

router.get('/sheets/status', h.status);
router.post('/sheets/sync', lim(RATE_LIMITS.adminSync), h.syncAll);
router.post('/sheets/sync/:id', lim(RATE_LIMITS.adminSync), h.syncOne);

export default router;
