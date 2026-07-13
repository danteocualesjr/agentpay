import { createHmac } from 'node:crypto';
import { generateId } from '@agentpay/shared';
import { db } from '../db/index.js';

export async function dispatchWebhook(
  orgId: string,
  eventType: string,
  data: Record<string, unknown>,
) {
  const endpoints = db
    .prepare('SELECT * FROM webhook_endpoints WHERE org_id = ? AND enabled = 1')
    .all(orgId) as Array<{ id: string; url: string; secret: string }>;

  if (endpoints.length === 0) return;

  const event = {
    id: generateId('event'),
    type: eventType,
    created_at: new Date().toISOString(),
    data,
  };

  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);

  for (const endpoint of endpoints) {
    const signed = `${timestamp}.${payload}`;
    const signature = createHmac('sha256', endpoint.secret).update(signed).digest('hex');

    fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AgentPay-Signature': `t=${timestamp},v1=${signature}`,
      },
      body: payload,
    }).catch(console.error);
  }
}

export function appendLedger(
  orgId: string,
  agentId: string,
  authorizationId: string | null,
  type: string,
  amountCents: number,
  description: string,
) {
  db.prepare(
    `INSERT INTO ledger_entries (id, org_id, agent_id, authorization_id, type, amount_cents, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    generateId('ledger'),
    orgId,
    agentId,
    authorizationId,
    type,
    amountCents,
    description,
    new Date().toISOString(),
  );
}
