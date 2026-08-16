import { Hono } from 'hono';
import { generateId, createAgentSchema, updateAgentSchema } from '@agentpay/shared';
import { db } from '../db/index.js';
import { getAgentSpendStats } from '../services/budget.js';

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

agentRoutes.get('/agents/:id/spend', (c) => {
  const org = c.get('org') as Org;
  const agentId = c.req.param('id');
  const row = db.prepare('SELECT * FROM agents WHERE id = ? AND org_id = ?').get(agentId, org.id) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    return c.json({ error: { type: 'not_found', message: 'Agent not found' } }, 404);
  }
  const stats = getAgentSpendStats(agentId, row.daily_budget_cents as number, new Date().toISOString());
  return c.json(stats);
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

agentRoutes.patch('/agents/:id', async (c) => {
  const org = c.get('org') as Org;
  const agentId = c.req.param('id');
  const existing = db.prepare('SELECT * FROM agents WHERE id = ? AND org_id = ?').get(agentId, org.id);
  if (!existing) {
    return c.json({ error: { type: 'not_found', message: 'Agent not found' } }, 404);
  }

  const body = await c.req.json();
  const parsed = updateAgentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { type: 'invalid_request', message: parsed.error.message } }, 400);
  }

  const updates = parsed.data;
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.daily_budget_cents !== undefined) {
    fields.push('daily_budget_cents = ?');
    values.push(updates.daily_budget_cents);
  }
  if (updates.max_single_tx_cents !== undefined) {
    fields.push('max_single_tx_cents = ?');
    values.push(updates.max_single_tx_cents);
  }
  if (updates.approval_threshold_cents !== undefined) {
    fields.push('approval_threshold_cents = ?');
    values.push(updates.approval_threshold_cents);
  }
  if (updates.merchant_allowlist !== undefined) {
    fields.push('merchant_allowlist = ?');
    values.push(JSON.stringify(updates.merchant_allowlist));
  }

  if (fields.length === 0) {
    return c.json({ error: { type: 'invalid_request', message: 'No fields to update' } }, 400);
  }

  values.push(agentId);
  db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
  return c.json(parseAgent(agent as Record<string, unknown>));
});
