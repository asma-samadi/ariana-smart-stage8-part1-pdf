/** Single source of truth for rate-limit settings (used by server.js / routes and by tests). */
export const RATE_LIMITS = {
  global: { windowMs: 60_000, limit: 120 },
  submit: { windowMs: 60_000, limit: 10 },
  admin: { windowMs: 60_000, limit: 30 },
  adminSync: { windowMs: 60_000, limit: 5 } // Sheets writes are quota-limited; keep this low
};
