import { Hono } from 'hono';
import { evaluatePolicy, getDayStart } from '@agentpay/policy-core';
import { authorizeSpendSchema, generateId } from '@agentpay/shared';
import { db } from '../db/index.js';
import { appendLedger, dispatchWebhook } from '../services/webhooks.js';

type Org = { id: string; name: string; api_key: string; webhook_secret: string; created_at: string };

function parseAuthorization(row: Record<string, unknown>) {
  return {
    ...row,
    metadata: JSON.parse((row.metadata as string) ?? '{}'),
  };
}

function getDailySpent(agentId: string, now: string): number {
  const dayStart = getDayStart(now);
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) as total FROM authorizations
       WHERE agent_id = ? AND status = 'captured' AND captured_at >= ?`,
    )
    .get(agentId, dayStart) as { total: number };
  return row.total;
}

function getAgent(orgId: string, agentId: string) {
  const row = db.prepare('SELECT * FROM agents WHERE id = ? AND org_id = ?').get(agentId, orgId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return {
    ...row,
    merchant_allowlist: JSON.parse(row.merchant_allowlist as string),
  };
}

export const authorizationRoutes = new Hono();

authorizationRoutes.get('/authorizations', (c) => {
  const org = c.get('org') as Org;
  const status = c.req.query('status');
  let rows;
  if (status) {
    rows = db
      .prepare('SELECT * FROM authorizations WHERE org_id = ? AND status = ? ORDER BY created_at DESC')
      .all(org.id, status);
  } else {
    rows = db
      .prepare('SELECT * FROM authorizations WHERE org_id = ? ORDER BY created_at DESC')
      .all(org.id);
  }
  return c.json({ data: rows.map((r) => parseAuthorization(r as Record<string, unknown>)) });
});

authorizationRoutes.get('/authorizations/:id', (c) => {
  const org = c.get('org') as Org;
  const row = db
    .prepare('SELECT * FROM authorizations WHERE id = ? AND org_id = ?')
    .get(c.req.param('id'), org.id);
  if (!row) {
    return c.json({ error: { type: 'not_found', message: 'Authorization not found' } }, 404);
  }
  return c.json(parseAuthorization(row as Record<string, unknown>));
});

authorizationRoutes.post('/agents/:id/authorize', async (c) => {
  const org = c.get('org') as Org;
  const agentId = c.req.param('id');
  const agent = getAgent(org.id, agentId);
  if (!agent) {
    return c.json({ error: { type: 'not_found', message: 'Agent not found' } }, 404);
  }
  if (agent.status !== 'active') {
    return c.json({ error: { type: 'invalid_request', message: 'Agent is not active' } }, 400);
  }

  const body = await c.req.json();
  const parsed = authorizeSpendSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { type: 'invalid_request', message: parsed.error.message } }, 400);
  }

  const { amount_cents, merchant, reason, currency, metadata = {} } = parsed.data;
  const now = new Date().toISOString();
  const dailySpent = getDailySpent(agentId, now);

  const policy = evaluatePolicy({
    amount_cents,
    merchant,
    daily_spent_cents: dailySpent,
    daily_budget_cents: agent.daily_budget_cents as number,
    max_single_tx_cents: agent.max_single_tx_cents as number,
    approval_threshold_cents: agent.approval_threshold_cents as number,
    merchant_allowlist: agent.merchant_allowlist as string[],
  });

  const id = generateId('authorization');
  const approvedAt = policy.status === 'approved' ? now : null;

  db.prepare(
    `INSERT INTO authorizations (id, org_id, agent_id, amount_cents, currency, merchant, reason, status, policy_decision, policy_message, metadata, created_at, approved_at, captured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  ).run(
    id,
    org.id,
    agentId,
    amount_cents,
    currency,
    merchant,
    reason,
    policy.status,
    policy.decision,
    policy.message,
    JSON.stringify(metadata),
    now,
    approvedAt,
  );

  appendLedger(
    org.id,
    agentId,
    id,
    'authorization_requested',
    amount_cents,
    `Spend request: ${reason} at ${merchant}`,
  );

  if (policy.status === 'approved') {
    appendLedger(org.id, agentId, id, 'authorization_approved', amount_cents, policy.message);
    dispatchWebhook(org.id, 'authorization.approved', { authorization_id: id, agent_id: agentId, amount_cents, merchant });
  } else if (policy.status === 'blocked') {
    appendLedger(org.id, agentId, id, 'authorization_blocked', amount_cents, policy.message);
    dispatchWebhook(org.id, 'authorization.blocked', { authorization_id: id, agent_id: agentId, amount_cents, merchant, reason: policy.message });
  } else {
    dispatchWebhook(org.id, 'authorization.requested', { authorization_id: id, agent_id: agentId, amount_cents, merchant });
  }

  const auth = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(id);
  return c.json(parseAuthorization(auth as Record<string, unknown>));
});

authorizationRoutes.post('/authorizations/:id/approve', (c) => {
  const org = c.get('org') as Org;
  const id = c.req.param('id');
  const auth = db
    .prepare('SELECT * FROM authorizations WHERE id = ? AND org_id = ?')
    .get(id, org.id) as Record<string, unknown> | undefined;

  if (!auth) {
    return c.json({ error: { type: 'not_found', message: 'Authorization not found' } }, 404);
  }
  if (auth.status !== 'pending') {
    return c.json({ error: { type: 'invalid_request', message: `Cannot approve authorization with status ${auth.status}` } }, 400);
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE authorizations SET status = ?, approved_at = ? WHERE id = ?').run('approved', now, id);

  appendLedger(
    org.id,
    auth.agent_id as string,
    id,
    'authorization_approved',
    auth.amount_cents as number,
    'Manually approved',
  );

  dispatchWebhook(org.id, 'authorization.approved', {
    authorization_id: id,
    agent_id: auth.agent_id,
    amount_cents: auth.amount_cents,
    merchant: auth.merchant,
  });

  const updated = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(id);
  return c.json(parseAuthorization(updated as Record<string, unknown>));
});

authorizationRoutes.post('/authorizations/:id/deny', (c) => {
  const org = c.get('org') as Org;
  const id = c.req.param('id');
  const auth = db
    .prepare('SELECT * FROM authorizations WHERE id = ? AND org_id = ?')
    .get(id, org.id) as Record<string, unknown> | undefined;

  if (!auth) {
    return c.json({ error: { type: 'not_found', message: 'Authorization not found' } }, 404);
  }
  if (auth.status !== 'pending') {
    return c.json({ error: { type: 'invalid_request', message: `Cannot deny authorization with status ${auth.status}` } }, 400);
  }

  db.prepare('UPDATE authorizations SET status = ? WHERE id = ?').run('denied', id);

  appendLedger(
    org.id,
    auth.agent_id as string,
    id,
    'authorization_denied',
    auth.amount_cents as number,
    'Manually denied',
  );

  dispatchWebhook(org.id, 'authorization.denied', {
    authorization_id: id,
    agent_id: auth.agent_id,
    amount_cents: auth.amount_cents,
    merchant: auth.merchant,
  });

  const updated = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(id);
  return c.json(parseAuthorization(updated as Record<string, unknown>));
});

authorizationRoutes.post('/authorizations/:id/capture', (c) => {
  const org = c.get('org') as Org;
  const id = c.req.param('id');
  const auth = db
    .prepare('SELECT * FROM authorizations WHERE id = ? AND org_id = ?')
    .get(id, org.id) as Record<string, unknown> | undefined;

  if (!auth) {
    return c.json({ error: { type: 'not_found', message: 'Authorization not found' } }, 404);
  }
  if (auth.status !== 'approved') {
    return c.json({ error: { type: 'invalid_request', message: `Cannot capture authorization with status ${auth.status}` } }, 400);
  }

  const now = new Date().toISOString();
  const dailySpent = getDailySpent(auth.agent_id as string, now);
  const agent = getAgent(org.id, auth.agent_id as string)!;

  if (dailySpent + (auth.amount_cents as number) > (agent.daily_budget_cents as number)) {
    return c.json({ error: { type: 'invalid_request', message: 'Daily budget would be exceeded on capture' } }, 400);
  }

  db.prepare('UPDATE authorizations SET status = ?, captured_at = ? WHERE id = ?').run('captured', now, id);

  appendLedger(
    org.id,
    auth.agent_id as string,
    id,
    'spend_captured',
    auth.amount_cents as number,
    `Captured spend at ${auth.merchant}`,
  );

  dispatchWebhook(org.id, 'spend.captured', {
    authorization_id: id,
    agent_id: auth.agent_id,
    amount_cents: auth.amount_cents,
    merchant: auth.merchant,
  });

  const updated = db.prepare('SELECT * FROM authorizations WHERE id = ?').get(id);
  return c.json(parseAuthorization(updated as Record<string, unknown>));
});
