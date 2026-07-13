import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';
import { agentRoutes } from './routes/agents.js';
import { authorizationRoutes } from './routes/authorizations.js';
import { webhookRoutes } from './routes/webhooks.js';

const app = new Hono();

app.use('*', cors({ origin: ['http://localhost:5174', 'http://127.0.0.1:5174'] }));

app.get('/health', (c) => c.json({ status: 'ok', service: 'agentpay-api' }));

const v1 = new Hono();
v1.use('*', authMiddleware);
v1.use('*', idempotencyMiddleware);
v1.route('/', agentRoutes);
v1.route('/', authorizationRoutes);
v1.route('/', webhookRoutes);

app.route('/v1', v1);

const port = Number(process.env.PORT ?? 3002);
console.log(`AgentPay API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
