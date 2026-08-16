import { Hono } from 'hono';
import { db } from '../db/index.js';

type Org = { id: string };

export const ledgerRoutes = new Hono();

ledgerRoutes.get('/ledger', (c) => {
  const org = c.get('org') as Org;
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500);
  const offset = Math.max(Number(c.req.query('offset') ?? 0), 0);

  const entries = db
    .prepare('SELECT * FROM ledger_entries WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(org.id, limit, offset);
  const total = db
    .prepare('SELECT COUNT(*) as count FROM ledger_entries WHERE org_id = ?')
    .get(org.id) as { count: number };

  return c.json({ data: entries, total: total.count, limit, offset });
});
