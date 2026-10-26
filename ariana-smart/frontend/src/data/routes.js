/**
 * FICTIONAL DEMONSTRATION DATA.
 * Airport codes are real IATA codes used only as labels. The route codes, durations and
 * frequencies below are invented for this educational project and are NOT real schedules.
 * City/airport names live in src/i18n/*.js (airports.*), one dictionary per language.
 * `minutes` is formatted per language by lib/format.js.
 */
export const sampleRoutes = [
  { id: 'r1', from: 'KBL', to: 'DXB', code: 'DEMO-101', minutes: 190, frequency: 'daily' },
  { id: 'r2', from: 'KBL', to: 'IST', code: 'DEMO-204', minutes: 305, frequency: 'threeWeekly' },
  { id: 'r3', from: 'KBL', to: 'DEL', code: 'DEMO-312', minutes: 110, frequency: 'daily' },
  { id: 'r4', from: 'HEA', to: 'DXB', code: 'DEMO-118', minutes: 175, frequency: 'weekly' },
  { id: 'r5', from: 'MZR', to: 'KBL', code: 'DEMO-020', minutes: 60, frequency: 'threeWeekly' },
  { id: 'r6', from: 'DXB', to: 'KBL', code: 'DEMO-102', minutes: 200, frequency: 'daily' }
];

export const statusKeys = [
  'draft',
  'submitted',
  'under_review',
  'documents_required',
  'approved_demo',
  'rejected',
  'cancelled'
];
