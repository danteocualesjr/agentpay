import type { Context, Next } from 'hono';
import { db } from '../db/index.js';

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: { type: 'authentication_error', message: 'Missing API key' } }, 401);
  }

  const apiKey = header.slice(7);
  const org = db.prepare('SELECT * FROM organizations WHERE api_key = ?').get(apiKey) as
    | { id: string; name: string; api_key: string; webhook_secret: string; created_at: string }
    | undefined;

  if (!org) {
    return c.json({ error: { type: 'authentication_error', message: 'Invalid API key' } }, 401);
  }

  c.set('org', org);
  await next();
}
