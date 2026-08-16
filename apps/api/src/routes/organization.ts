import { Hono } from 'hono';

type Org = { id: string; name: string; api_key: string; webhook_secret: string; created_at: string };

export const organizationRoutes = new Hono();

organizationRoutes.get('/organization', (c) => {
  const org = c.get('org') as Org;
  return c.json({
    id: org.id,
    name: org.name,
    created_at: org.created_at,
    api_key_preview: `${org.api_key.slice(0, 10)}…${org.api_key.slice(-4)}`,
  });
});
