import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';
import { agentRoutes } from './routes/agents.js';
import { authorizationRoutes } from './routes/authorizations.js';
import { webhookRoutes } from './routes/webhooks.js';
import { organizationRoutes } from './routes/organization.js';
import { ledgerRoutes } from './routes/ledger.js';
import { statsRoutes } from './routes/stats.js';
import { docsRoutes } from './routes/docs.js';

const app = new Hono();
const startedAt = Date.now();

app.use('*', cors({ origin: ['http://localhost:5174', 'http://127.0.0.1:5174'] }));

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    service: 'agentpay-api',
    version: '0.1.0',
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
  }),
);

const v1 = new Hono();
v1.use('*', authMiddleware);
v1.use('*', idempotencyMiddleware);
v1.route('/', agentRoutes);
v1.route('/', authorizationRoutes);
v1.route('/', webhookRoutes);
v1.route('/', organizationRoutes);
v1.route('/', ledgerRoutes);
v1.route('/', statsRoutes);
v1.route('/', docsRoutes);

app.route('/v1', v1);

const port = Number(process.env.PORT ?? 3002);
console.log(`AgentPay API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
