const API_KEY_STORAGE = 'agentpay_api_key';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  agents: () => request<{ data: Agent[] }>('/v1/agents'),
  authorizations: (status?: string) =>
    request<{ data: Authorization[] }>(`/v1/authorizations${status ? `?status=${status}` : ''}`),
  ledger: (agentId: string) => request<{ data: LedgerEntry[] }>(`/v1/agents/${agentId}/ledger`),
  authorize: (agentId: string, body: object) =>
    request<Authorization>(`/v1/agents/${agentId}/authorize`, { method: 'POST', body: JSON.stringify(body) }),
  approve: (id: string) => request<Authorization>(`/v1/authorizations/${id}/approve`, { method: 'POST' }),
  deny: (id: string) => request<Authorization>(`/v1/authorizations/${id}/deny`, { method: 'POST' }),
  capture: (id: string) => request<Authorization>(`/v1/authorizations/${id}/capture`, { method: 'POST' }),
  createAgent: (body: object) =>
    request<Agent>('/v1/agents', { method: 'POST', body: JSON.stringify(body) }),
};

export interface Agent {
  id: string;
  name: string;
  daily_budget_cents: number;
  max_single_tx_cents: number;
  approval_threshold_cents: number;
  merchant_allowlist: string[];
  status: string;
  created_at: string;
}

export interface Authorization {
  id: string;
  agent_id: string;
  amount_cents: number;
  currency: string;
  merchant: string;
  reason: string;
  status: string;
  policy_decision: string;
  policy_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  approved_at: string | null;
  captured_at: string | null;
}

export interface LedgerEntry {
  id: string;
  agent_id: string;
  authorization_id: string | null;
  type: string;
  amount_cents: number;
  description: string;
  created_at: string;
}
