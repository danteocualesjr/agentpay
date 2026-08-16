import { getDayStart } from '@agentpay/policy-core';
import { db } from '../db/index.js';

export function getDailyCaptured(agentId: string, now: string): number {
  const dayStart = getDayStart(now);
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) as total FROM authorizations
       WHERE agent_id = ? AND status = 'captured' AND captured_at >= ?`,
    )
    .get(agentId, dayStart) as { total: number };
  return row.total;
}

export function getOutstandingCommitments(agentId: string, excludeAuthorizationId?: string): number {
  let query = `SELECT COALESCE(SUM(amount_cents), 0) as total FROM authorizations
     WHERE agent_id = ? AND status IN ('approved', 'pending')`;
  const params: string[] = [agentId];
  if (excludeAuthorizationId) {
    query += ' AND id != ?';
    params.push(excludeAuthorizationId);
  }
  const row = db.prepare(query).get(...params) as { total: number };
  return row.total;
}

export function getDailyBudgetUsage(agentId: string, now: string, excludeAuthorizationId?: string): number {
  return getDailyCaptured(agentId, now) + getOutstandingCommitments(agentId, excludeAuthorizationId);
}

export function getAgentSpendStats(agentId: string, dailyBudgetCents: number, now: string) {
  const capturedToday = getDailyCaptured(agentId, now);
  const committed = getOutstandingCommitments(agentId);
  const used = capturedToday + committed;
  return {
    daily_budget_cents: dailyBudgetCents,
    captured_today_cents: capturedToday,
    committed_cents: committed,
    used_cents: used,
    remaining_cents: Math.max(0, dailyBudgetCents - used),
  };
}
