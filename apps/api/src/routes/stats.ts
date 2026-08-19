import { Hono } from 'hono';
import { db } from '../db/index.js';

type Org = { id: string };

export const statsRoutes = new Hono();

statsRoutes.get('/stats', (c) => {
  const org = c.get('org') as Org;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const pending = db
    .prepare("SELECT COUNT(*) as count FROM authorizations WHERE org_id = ? AND status = 'pending'")
    .get(org.id) as { count: number };
  const capturedTotal = db
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM authorizations WHERE org_id = ? AND status = 'captured'")
    .get(org.id) as { total: number };
  const weeklyCaptured = db
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) as total FROM authorizations WHERE org_id = ? AND status = 'captured' AND captured_at >= ?")
    .get(org.id, weekAgo) as { total: number };
  const blocked = db
    .prepare("SELECT COUNT(*) as count FROM authorizations WHERE org_id = ? AND status = 'blocked'")
    .get(org.id) as { count: number };
  const activeAgents = db
    .prepare("SELECT COUNT(*) as count FROM agents WHERE org_id = ? AND status = 'active'")
    .get(org.id) as { count: number };

  return c.json({
    pending_approvals: pending.count,
    captured_total_cents: capturedTotal.total,
    weekly_captured_cents: weeklyCaptured.total,
    blocked_count: blocked.count,
    active_agents: activeAgents.count,
  });
});
