import { Hono } from 'hono';
import { generateId, createAgentSchema } from '@agentpay/shared';
import { db } from '../db/index.js';

type Org = { id: string; name: string; api_key: string; webhook_secret: string; created_at: string };

function parseAgent(row: Record<string, unknown>) {
  return {
    ...row,
    merchant_allowlist: JSON.parse(row.merchant_allowlist as string),
  };
}

export const agentRoutes = new Hono();

agentRoutes.post('/agents', async (c) => {
  const org = c.get('org') as Org;
  const body = await c.req.json();
  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { type: 'invalid_request', message: parsed.error.message } }, 400);
  }

  const {
    name,
    daily_budget_cents,
    max_single_tx_cents = daily_budget_cents,
    approval_threshold_cents = Math.floor(daily_budget_cents * 0.8),
    merchant_allowlist,
  } = parsed.data;

  const id = generateId('agent');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO agents (id, org_id, name, daily_budget_cents, max_single_tx_cents, approval_threshold_cents, merchant_allowlist, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
  ).run(
    id,
    org.id,
    name,
    daily_budget_cents,
    max_single_tx_cents,
    approval_threshold_cents,
    JSON.stringify(merchant_allowlist),
    now,
  );

  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  return c.json(parseAgent(agent as Record<string, unknown>));
});

agentRoutes.get('/agents', (c) => {
  const org = c.get('org') as Org;
  const rows = db.prepare('SELECT * FROM agents WHERE org_id = ? ORDER BY created_at DESC').all(org.id);
  return c.json({ data: rows.map((r) => parseAgent(r as Record<string, unknown>)) });
});

agentRoutes.get('/agents/:id', (c) => {
  const org = c.get('org') as Org;
  const row = db.prepare('SELECT * FROM agents WHERE id = ? AND org_id = ?').get(c.req.param('id'), org.id);
  if (!row) {
    return c.json({ error: { type: 'not_found', message: 'Agent not found' } }, 404);
  }
  return c.json(parseAgent(row as Record<string, unknown>));
});

agentRoutes.get('/agents/:id/ledger', (c) => {
  const org = c.get('org') as Org;
  const agentId = c.req.param('id');
  const agent = db.prepare('SELECT id FROM agents WHERE id = ? AND org_id = ?').get(agentId, org.id);
  if (!agent) {
    return c.json({ error: { type: 'not_found', message: 'Agent not found' } }, 404);
  }

  const entries = db
    .prepare('SELECT * FROM ledger_entries WHERE agent_id = ? ORDER BY created_at DESC')
    .all(agentId);
  return c.json({ data: entries });
});
