import { Hono } from 'hono';

export const docsRoutes = new Hono();

const routes = [
  { method: 'GET', path: '/health', auth: false, description: 'Service health check' },
  { method: 'GET', path: '/v1/organization', auth: true, description: 'Organization details' },
  { method: 'GET', path: '/v1/stats', auth: true, description: 'Organization aggregate stats' },
  { method: 'GET', path: '/v1/docs', auth: true, description: 'API route listing' },
  { method: 'GET', path: '/v1/agents', auth: true, description: 'List agents' },
  { method: 'POST', path: '/v1/agents', auth: true, description: 'Create agent' },
  { method: 'GET', path: '/v1/agents/:id/spend', auth: true, description: 'Agent budget usage' },
  { method: 'POST', path: '/v1/agents/:id/authorize', auth: true, description: 'Request spend authorization' },
  { method: 'GET', path: '/v1/authorizations', auth: true, description: 'List authorizations' },
  { method: 'POST', path: '/v1/authorizations/:id/approve', auth: true, description: 'Approve pending authorization' },
  { method: 'POST', path: '/v1/authorizations/:id/deny', auth: true, description: 'Deny pending authorization' },
  { method: 'POST', path: '/v1/authorizations/:id/capture', auth: true, description: 'Capture approved spend' },
  { method: 'POST', path: '/v1/authorizations/:id/revoke', auth: true, description: 'Revoke approved authorization' },
  { method: 'GET', path: '/v1/ledger', auth: true, description: 'Org-wide audit log' },
  { method: 'GET', path: '/v1/webhook_endpoints', auth: true, description: 'List webhook endpoints' },
];

docsRoutes.get('/docs', (c) => c.json({ version: '0.1.0', routes }));
