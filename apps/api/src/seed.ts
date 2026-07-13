import { generateId } from '@agentpay/shared';
import { db } from './db/index.js';

const orgId = generateId('org');
const apiKey = 'ap_test_' + crypto.randomUUID().replace(/-/g, '');
const webhookSecret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
const now = new Date().toISOString();

db.prepare('DELETE FROM ledger_entries').run();
db.prepare('DELETE FROM authorizations').run();
db.prepare('DELETE FROM agents').run();
db.prepare('DELETE FROM webhook_endpoints').run();
db.prepare('DELETE FROM idempotency_keys').run();
db.prepare('DELETE FROM organizations').run();

db.prepare(
  'INSERT INTO organizations (id, name, api_key, webhook_secret, created_at) VALUES (?, ?, ?, ?, ?)',
).run(orgId, 'Demo Organization', apiKey, webhookSecret, now);

const agentId = generateId('agent');
db.prepare(
  `INSERT INTO agents (id, org_id, name, daily_budget_cents, max_single_tx_cents, approval_threshold_cents, merchant_allowlist, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
).run(
  agentId,
  orgId,
  'Research Bot',
  25000,
  10000,
  2000,
  JSON.stringify(['api.search.io', 'datasets.io', '*.openai.com']),
  now,
);

console.log('\n=== AgentPay Seed Complete ===');
console.log('API Key:', apiKey);
console.log('Organization ID:', orgId);
console.log('Agent ID:', agentId);
console.log('\nUse: Authorization: Bearer', apiKey);
console.log('\nDemo authorizations to try:');
console.log('  $4.99 at api.search.io  → auto-approved');
console.log('  $89.00 at datasets.io   → pending approval');
console.log('  $200 at unknown.shop    → blocked');
