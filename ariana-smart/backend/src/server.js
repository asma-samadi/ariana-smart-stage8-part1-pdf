import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import meRoutes from './routes/me.js';
import applicationRoutes from './routes/applications.js';
import documentRoutes from './routes/documents.js';
import adminRoutes from './routes/admin.js';
import { RATE_LIMITS } from './lib/rateLimits.js';
import { sheetsSummary } from './lib/sheetsRuntime.js';

const app = express();
const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(helmet());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit(RATE_LIMITS.global));

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  service: 'ariana-smart-backend',
  supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
  aiConfigured: (process.env.AI_PROVIDER || 'none') !== 'none',
  sheetsConfigured: sheetsSummary().configured
}));

app.use('/api', applicationRoutes); // Stage 4: POST /api/applications
app.use('/api', documentRoutes); // Stage 5: private document upload/list/signed-url/delete
app.use('/api', meRoutes); // Stage 3: JWT-verified identity endpoint
app.use('/api/admin', adminRoutes); // Stage 6: administrator-only (requireAuth + requireAdmin on every route)
// Later stages mount: /api/assistant
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return res.status(400).json({ error: 'Bad request body' });
  console.error(err.message); // never log secrets or passenger data
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`API listening on :${port}`));
