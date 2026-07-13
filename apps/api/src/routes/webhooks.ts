import { Hono } from 'hono';
import { createWebhookEndpointSchema, generateId } from '@agentpay/shared';
import { db } from '../db/index.js';

type Org = { id: string; name: string; api_key: string; webhook_secret: string; created_at: string };

export const webhookRoutes = new Hono();

webhookRoutes.post('/webhook_endpoints', async (c) => {
  const org = c.get('org') as Org;
  const body = await c.req.json();
  const parsed = createWebhookEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { type: 'invalid_request', message: parsed.error.message } }, 400);
  }

  const id = generateId('webhook');
  const secret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO webhook_endpoints (id, org_id, url, secret, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)',
  ).run(id, org.id, parsed.data.url, secret, now);

  const endpoint = db.prepare('SELECT * FROM webhook_endpoints WHERE id = ?').get(id);
  return c.json({ ...(endpoint as object), enabled: true });
});

webhookRoutes.get('/webhook_endpoints', (c) => {
  const org = c.get('org') as Org;
  const rows = db
    .prepare('SELECT id, org_id, url, enabled, created_at FROM webhook_endpoints WHERE org_id = ?')
    .all(org.id);
  return c.json({
    data: rows.map((r) => ({
      ...(r as object),
      enabled: (r as { enabled: number }).enabled === 1,
    })),
  });
});
