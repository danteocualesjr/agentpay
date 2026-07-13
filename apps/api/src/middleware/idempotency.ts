import type { Context, Next } from 'hono';
import { db } from '../db/index.js';

export async function idempotencyMiddleware(c: Context, next: Next) {
  if (c.req.method === 'GET') {
    await next();
    return;
  }

  const key = c.req.header('Idempotency-Key');
  if (!key) {
    await next();
    return;
  }

  const org = c.get('org') as { id: string };
  const existing = db
    .prepare('SELECT response FROM idempotency_keys WHERE key = ? AND org_id = ?')
    .get(key, org.id) as { response: string } | undefined;

  if (existing) {
    return c.json(JSON.parse(existing.response));
  }

  await next();

  if (c.res.status >= 200 && c.res.status < 300) {
    const cloned = c.res.clone();
    const body = await cloned.json();
    db.prepare('INSERT OR REPLACE INTO idempotency_keys (key, org_id, response, created_at) VALUES (?, ?, ?, ?)').run(
      key,
      org.id,
      JSON.stringify(body),
      new Date().toISOString(),
    );
  }
}
