import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePolicy, merchantAllowed } from './policy.js';

describe('merchantAllowed', () => {
  it('allows all when allowlist is empty', () => {
    assert.equal(merchantAllowed('any.shop', []), true);
  });

  it('matches exact merchant', () => {
    assert.equal(merchantAllowed('api.search.io', ['api.search.io']), true);
  });

  it('matches wildcard subdomain', () => {
    assert.equal(merchantAllowed('pay.stripe.com', ['*.stripe.com']), true);
  });

  it('blocks unknown merchant', () => {
    assert.equal(merchantAllowed('evil.shop', ['api.search.io']), false);
  });
});

describe('evaluatePolicy', () => {
  const base = {
    daily_budget_cents: 2500,
    max_single_tx_cents: 5000,
    approval_threshold_cents: 2000,
    merchant_allowlist: ['api.search.io', 'datasets.io'],
    daily_spent_cents: 0,
  };

  it('auto-approves small allowed purchase', () => {
    const result = evaluatePolicy({
      ...base,
      amount_cents: 499,
      merchant: 'api.search.io',
    });
    assert.equal(result.status, 'approved');
    assert.equal(result.decision, 'auto_approved');
  });

  it('requires approval above threshold', () => {
    const result = evaluatePolicy({
      ...base,
      daily_budget_cents: 10000,
      max_single_tx_cents: 10000,
      amount_cents: 8900,
      merchant: 'datasets.io',
    });
    assert.equal(result.status, 'pending');
    assert.equal(result.decision, 'requires_approval');
  });

  it('blocks disallowed merchant', () => {
    const result = evaluatePolicy({
      ...base,
      amount_cents: 100,
      merchant: 'unknown.shop',
    });
    assert.equal(result.status, 'blocked');
  });

  it('blocks when daily budget exceeded', () => {
    const result = evaluatePolicy({
      ...base,
      daily_spent_cents: 2400,
      amount_cents: 200,
      merchant: 'api.search.io',
    });
    assert.equal(result.status, 'blocked');
  });
});
