/** IN-MEMORY FAKES. They imitate the parts of Supabase / Google Sheets that the code uses. They are NOT real services. */

export function fakeDb(seed = []) {
  const rows = seed.map((r, i) => ({
    id: `id-${i + 1}`, reference: `ASM-2026-${1000 + i}`, status: 'submitted', origin: 'KBL', destination: 'DXB', trip_type: 'one_way',
    depart_date: '2026-11-01', return_date: null, passengers: 1, nationality: 'Testland', created_at: '2026-10-18T00:00:00Z',
    // sensitive columns that must NEVER reach the sheet:
    full_name: 'Sample Person', email: 'sample@example.com', phone: '+000 000 0000', id_document_number: 'SAMPLE12345', date_of_birth: '1990-01-01', user_id: 'user-1', idempotency_key: 'k'.repeat(24),
    sheet_sync_status: 'pending', sheet_sync_attempts: 0, sheet_sync_error: null, sheet_sync_started_at: null, ...r
  }));
  const ALLOWED = ['reference', 'created_at', 'status', 'origin', 'destination', 'trip_type', 'depart_date', 'return_date', 'passengers', 'nationality'];
  const ctl = { rpcCalls: 0, clock: () => Date.now() };
  const query = (filters = [], patch = null, order = null, lim = Infinity) => {
    const api = {
      select: () => api,
      eq: (c, v) => query([...filters, (r) => r[c] === v], patch, order, lim),
      in: (c, vs) => query([...filters, (r) => vs.includes(r[c])], patch, order, lim),
      order: (c, o) => query(filters, patch, { c, asc: o?.ascending !== false }, lim),
      limit: (n) => query(filters, patch, order, n),
      update: (p) => query(filters, p, order, lim),
      then: (res) => {
        let hit = rows.filter((r) => filters.every((f) => f(r)));
        if (patch) { hit.forEach((r) => Object.assign(r, patch)); return res({ data: null, error: null }); }
        if (order) hit = [...hit].sort((a, b) => (a[order.c] < b[order.c] ? -1 : 1) * (order.asc ? 1 : -1));
        return res({ data: hit.slice(0, lim).map((r) => ({ ...r })), error: null });
      }
    };
    return api;
  };
  return {
    rows, ctl,
    from: () => query(),
    // Same semantics as the SQL function claim_sheet_sync (atomic: JS is single-threaded between awaits)
    async rpc(name, { p_id }) {
      ctl.rpcCalls++;
      if (name !== 'claim_sheet_sync') return { data: null, error: new Error('unknown rpc') };
      const r = rows.find((x) => x.id === p_id);
      const stale = r?.sheet_sync_status === 'syncing' && r.sheet_sync_started_at < ctl.clock() - 5 * 60_000;
      if (!r || !(['pending', 'failed', 'disabled'].includes(r.sheet_sync_status) || stale)) return { data: [], error: null };
      Object.assign(r, { sheet_sync_status: 'syncing', sheet_sync_started_at: ctl.clock(), sheet_sync_attempts: r.sheet_sync_attempts + 1 });
      return { data: [Object.fromEntries(ALLOWED.map((k) => [k, r[k]]))], error: null };
    }
  };
}

/** Fake of the Sheets client used by sheetsSync (hasReference / appendRow) with failure injection. */
export function fakeSheets({ failures = [], delay = false } = {}) {
  const sheet = { appended: [], refs: new Set(), calls: 0 };
  const queue = [...failures]; // each item: an error object thrown on the next call(s)
  const maybeFail = () => { sheet.calls++; if (queue.length) throw queue.shift(); };
  return {
    sheet,
    async hasReference(ref) { maybeFail(); if (delay) await Promise.resolve(); return sheet.refs.has(ref); },
    async appendRow(values) { maybeFail(); if (delay) await Promise.resolve(); sheet.appended.push(values); sheet.refs.add(values[0]); }
  };
}
export const httpErr = (status) => Object.assign(new Error('raw upstream message SHOULD-NOT-LEAK'), { response: { status } });
export const noSleep = async () => {};
