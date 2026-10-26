import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import PDFDocument from 'pdfkit';
import { requireAuth } from '../middleware/requireAuth.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';
import { createApplication, getApplicationPdfSummary } from '../lib/applicationService.js';
import { scheduleSync } from '../lib/sheetsRuntime.js';
import { RATE_LIMITS } from '../lib/rateLimits.js';

const router = Router();
const submitLimiter = rateLimit({ ...RATE_LIMITS.submit, standardHeaders: true, legacyHeaders: false });
const pdfLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });

function safePdfText(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value).replace(/[\r\n\t]+/g, ' ').slice(0, 160);
}

export async function handleCreate(req, res, next) {
  try {
    const out = await createApplication({ admin: getSupabaseAdmin(), userId: req.user.id, input: req.body, onCreated: scheduleSync });
    res.status(out.status).json(out.body);
  } catch (e) { next(e); } // generic 500 in server.js; details are never sent to the client
}

/** Generates a small, private PDF containing only non-sensitive application summary fields. */
export async function handleApplicationPdf(req, res, next) {
  try {
    const out = await getApplicationPdfSummary({ admin: getSupabaseAdmin(), userId: req.user.id, applicationId: req.params.id });
    if (out.status !== 200) return res.status(out.status).json(out.body);
    const app = out.application;
    const doc = new PDFDocument({ size: 'A4', margin: 54, info: { Title: 'Ariana Smart Application Summary', Author: 'Ariana Smart' } });
    const filenameRef = safePdfText(app.reference, 'application').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50) || 'application';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ariana-application-${filenameRef}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    doc.on('error', next);
    doc.pipe(res);
    doc.fontSize(20).text('Ariana Smart');
    doc.moveDown(0.3).fontSize(13).text('Application Summary');
    doc.moveDown(1);
    const rows = [
      ['Reference', app.reference], ['Status', app.status], ['Origin', app.origin], ['Destination', app.destination],
      ['Trip type', app.trip_type === 'return' ? 'Return' : 'One way'], ['Departure date', app.depart_date],
      ['Return date', app.return_date], ['Passengers', app.passengers],
      ['Submitted', app.created_at ? new Date(app.created_at).toISOString().slice(0, 10) : null]
    ];
    for (const [label, value] of rows) {
      if (label === 'Return date' && app.trip_type !== 'return') continue;
      doc.fontSize(10).fillColor('#475569').text(label);
      doc.fontSize(12).fillColor('#0f172a').text(safePdfText(value));
      doc.moveDown(0.55);
    }
    doc.moveDown(1).fontSize(9).fillColor('#64748b').text('This is an application summary only. It is not a ticket or confirmation of travel.');
    doc.end();
  } catch (e) { next(e); }
}

router.get('/applications/:id/pdf', pdfLimiter, requireAuth, handleApplicationPdf);
router.post('/applications', submitLimiter, requireAuth, handleCreate);
export default router;
