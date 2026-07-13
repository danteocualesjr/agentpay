export type AgentStatus = 'active' | 'paused' | 'disabled';

export type AuthorizationStatus =
  | 'pending'
  | 'approved'
  | 'blocked'
  | 'denied'
  | 'captured';

export type PolicyDecision = 'auto_approved' | 'requires_approval' | 'blocked';

export type LedgerEntryType =
  | 'authorization_requested'
  | 'authorization_approved'
  | 'authorization_blocked'
  | 'authorization_denied'
  | 'spend_captured';

export interface Organization {
  id: string;
  name: string;
  api_key: string;
  webhook_secret: string;
  created_at: string;
}

export interface Agent {
  id: string;
  org_id: string;
  name: string;
  daily_budget_cents: number;
  max_single_tx_cents: number;
  approval_threshold_cents: number;
  merchant_allowlist: string[];
  status: AgentStatus;
  created_at: string;
}

export interface Authorization {
  id: string;
  org_id: string;
  agent_id: string;
  amount_cents: number;
  currency: string;
  merchant: string;
  reason: string;
  status: AuthorizationStatus;
  policy_decision: PolicyDecision;
  policy_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  approved_at: string | null;
  captured_at: string | null;
}

export interface LedgerEntry {
  id: string;
  org_id: string;
  agent_id: string;
  authorization_id: string | null;
  type: LedgerEntryType;
  amount_cents: number;
  description: string;
  created_at: string;
}

export interface WebhookEndpoint {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  enabled: boolean;
  created_at: string;
}

export interface PolicyInput {
  amount_cents: number;
  merchant: string;
  daily_spent_cents: number;
  daily_budget_cents: number;
  max_single_tx_cents: number;
  approval_threshold_cents: number;
  merchant_allowlist: string[];
}

export interface PolicyResult {
  decision: PolicyDecision;
  status: AuthorizationStatus;
  message: string;
}
