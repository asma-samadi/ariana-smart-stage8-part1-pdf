import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/requireAuth.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { deleteDocument, getDocumentUrl, listDocuments, uploadDocument } from '../lib/documentService.js';
import { HARD_MAX_FILE_BYTES } from '../lib/documentRules.js';

const router = Router();
const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'application-documents';
export const maxBytes = () => {
  const mb = Number(process.env.MAX_UPLOAD_MB);
  return Number.isFinite(mb) && mb > 0 ? Math.min(mb * 1024 * 1024, HARD_MAX_FILE_BYTES) : 5 * 1024 * 1024;
};

const uploadLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
const readLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false });

// Memory storage: nothing is written to the server disk; one file, one text field, hard size cap enforced while streaming.
const parse = (req, res, next) => multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes(), files: 1, fields: 2, parts: 4 } })
  .single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'validation_failed', code: 'fileTooLarge' });
    return res.status(400).json({ error: 'validation_failed', code: 'badUpload' });
  });

const run = (fn) => async (req, res, next) => {
  try { const out = await fn(req); res.status(out.status).json(out.body); } catch (e) { next(e); }
};
const ctx = (req) => ({ admin: getSupabaseAdmin(), bucket: bucket(), userId: req.user.id });

router.get('/applications/:id/documents', readLimiter, requireAuth, run((req) => listDocuments({ ...ctx(req), applicationId: req.params.id })));
router.post('/applications/:id/documents', uploadLimiter, requireAuth, parse,
  run((req) => uploadDocument({ ...ctx(req), applicationId: req.params.id, docType: req.body?.docType, file: req.file, maxBytes: maxBytes() })));
router.get('/documents/:id/url', readLimiter, requireAuth, run((req) => getDocumentUrl({ ...ctx(req), documentId: req.params.id })));
router.delete('/documents/:id', uploadLimiter, requireAuth, run((req) => deleteDocument({ ...ctx(req), documentId: req.params.id })));

export default router;
