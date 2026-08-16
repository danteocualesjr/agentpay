const API_KEY_STORAGE = 'agentpay_api_key';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function setApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE);
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
  authorizations: (status?: string, limit = 100, offset = 0) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    return request<{ data: Authorization[]; total: number; limit: number; offset: number }>(
      `/v1/authorizations?${params.toString()}`,
    );
  },
  ledger: (agentId: string) => request<{ data: LedgerEntry[] }>(`/v1/agents/${agentId}/ledger`),
  orgLedger: (limit = 100, offset = 0) =>
    request<{ data: LedgerEntry[]; total: number; limit: number; offset: number }>(
      `/v1/ledger?limit=${limit}&offset=${offset}`,
    ),
  authorize: (agentId: string, body: object) =>
    request<Authorization>(`/v1/agents/${agentId}/authorize`, { method: 'POST', body: JSON.stringify(body) }),
  approve: (id: string) => request<Authorization>(`/v1/authorizations/${id}/approve`, { method: 'POST' }),
  deny: (id: string) => request<Authorization>(`/v1/authorizations/${id}/deny`, { method: 'POST' }),
  capture: (id: string) => request<Authorization>(`/v1/authorizations/${id}/capture`, { method: 'POST' }),
  createAgent: (body: object) =>
    request<Agent>('/v1/agents', { method: 'POST', body: JSON.stringify(body) }),
  updateAgentStatus: (id: string, status: string) =>
    request<Agent>(`/v1/agents/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateAgent: (id: string, body: object) =>
    request<Agent>(`/v1/agents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  webhooks: () => request<{ data: WebhookEndpoint[] }>('/v1/webhook_endpoints'),
  createWebhook: (body: object) =>
    request<WebhookEndpoint & { secret: string }>('/v1/webhook_endpoints', { method: 'POST', body: JSON.stringify(body) }),
  updateWebhook: (id: string, enabled: boolean) =>
    request<WebhookEndpoint>(`/v1/webhook_endpoints/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  deleteWebhook: (id: string) =>
    request<{ deleted: boolean; id: string }>(`/v1/webhook_endpoints/${id}`, { method: 'DELETE' }),
  organization: () => request<Organization>('/v1/organization'),
  authorization: (id: string) => request<Authorization>(`/v1/authorizations/${id}`),
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

export interface WebhookEndpoint {
  id: string;
  org_id: string;
  url: string;
  enabled: boolean;
  created_at: string;
  secret?: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  api_key_preview: string;
}
