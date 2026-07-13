import type { PolicyInput, PolicyResult } from '@agentpay/shared';

export function merchantAllowed(merchant: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  const normalized = merchant.toLowerCase();
  return allowlist.some((pattern) => {
    const p = pattern.toLowerCase();
    if (p.startsWith('*.')) {
      const suffix = p.slice(1);
      return normalized === p.slice(2) || normalized.endsWith(suffix);
    }
    return normalized === p || normalized.endsWith(`.${p}`);
  });
}

export function getDayStart(iso: string): string {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function evaluatePolicy(input: PolicyInput): PolicyResult {
  const {
    amount_cents,
    merchant,
    daily_spent_cents,
    daily_budget_cents,
    max_single_tx_cents,
    approval_threshold_cents,
    merchant_allowlist,
  } = input;

  if (!merchantAllowed(merchant, merchant_allowlist)) {
    return {
      decision: 'blocked',
      status: 'blocked',
      message: `Merchant "${merchant}" is not on the allowlist`,
    };
  }

  if (amount_cents > max_single_tx_cents) {
    return {
      decision: 'blocked',
      status: 'blocked',
      message: `Amount ${amount_cents} exceeds single-transaction limit of ${max_single_tx_cents}`,
    };
  }

  if (daily_spent_cents + amount_cents > daily_budget_cents) {
    return {
      decision: 'blocked',
      status: 'blocked',
      message: `Daily budget exceeded: ${daily_spent_cents + amount_cents} > ${daily_budget_cents}`,
    };
  }

  if (amount_cents > approval_threshold_cents) {
    return {
      decision: 'requires_approval',
      status: 'pending',
      message: `Amount ${amount_cents} exceeds approval threshold of ${approval_threshold_cents}`,
    };
  }

  return {
    decision: 'auto_approved',
    status: 'approved',
    message: 'Within policy limits',
  };
}
