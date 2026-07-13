import { useCallback, useEffect, useState } from 'react';
import { api, clearApiKey, getApiKey, setApiKey, type Agent, type Authorization, type LedgerEntry } from './api';
import {
  IconAgents,
  IconCheck,
  IconHome,
  IconLedger,
  IconLogo,
  IconPlay,
  IconRefresh,
  IconSearch,
  IconShield,
  IconSignOut,
  IconX,
} from './icons';

type Tab = 'overview' | 'agents' | 'authorizations' | 'ledger' | 'simulate';
type AuthFilter = 'all' | 'pending' | 'approved' | 'captured' | 'blocked' | 'denied';
type Toast = { id: number; message: string; type: 'success' | 'error' };

const NAV: { id: Tab; label: string; icon: typeof IconHome }[] = [
  { id: 'overview', label: 'Home', icon: IconHome },
  { id: 'agents', label: 'Agents', icon: IconAgents },
  { id: 'authorizations', label: 'Approvals', icon: IconShield },
  { id: 'ledger', label: 'Audit log', icon: IconLedger },
  { id: 'simulate', label: 'Simulate', icon: IconPlay },
];

const PAGE_META: Record<Tab, { title: string; description: string }> = {
  overview: {
    title: 'Home',
    description: 'Monitor agent spending, pending approvals, and policy activity at a glance.',
  },
  agents: {
    title: 'Agents',
    description: 'Manage AI agents, daily budgets, merchant allowlists, and approval thresholds.',
  },
  authorizations: {
    title: 'Approvals',
    description: 'Review, approve, deny, and capture agent spend authorization requests.',
  },
  ledger: {
    title: 'Audit log',
    description: 'Immutable record of every authorization attempt and spend capture.',
  },
  simulate: {
    title: 'Simulate',
    description: 'Test the policy engine with sample spend requests.',
  },
};

const AUTH_FILTERS: { id: AuthFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'captured', label: 'Captured' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'denied', label: 'Denied' },
];

const SIM_PRESETS = [
  {
    label: 'Auto-approve',
    outcome: 'Approved instantly',
    amount: '499',
    merchant: 'api.search.io',
    reason: 'Paid search API query batch',
    variant: 'success' as const,
  },
  {
    label: 'Needs approval',
    outcome: 'Pending review',
    amount: '8900',
    merchant: 'datasets.io',
    reason: 'Premium dataset subscription',
    variant: 'warning' as const,
  },
  {
    label: 'Blocked',
    outcome: 'Policy denied',
    amount: '20000',
    merchant: 'unknown.shop',
    reason: 'Off-allowlist purchase attempt',
    variant: 'danger' as const,
  },
];

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function budgetLevel(pct: number): 'normal' | 'warning' | 'danger' {
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warning';
  return 'normal';
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
}

function activityIcon(status: string) {
  if (status === 'approved') return '✓';
  if (status === 'pending') return '…';
  if (status === 'captured') return '$';
  return '✕';
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

function MetricsSkeleton() {
  return (
    <div className="metrics-row">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="metric-card">
          <Skeleton className="skeleton-text-sm" />
          <Skeleton className="skeleton-value" />
          <Skeleton className="skeleton-text-xs" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-card">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton className="skeleton-text-xs" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton className="skeleton-text-sm" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [authFilter, setAuthFilter] = useState<AuthFilter>('all');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [simAmount, setSimAmount] = useState('499');
  const [simMerchant, setSimMerchant] = useState('api.search.io');
  const [simReason, setSimReason] = useState('Paid search API query batch');
  const [simulating, setSimulating] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const refresh = useCallback(async () => {
    if (!getApiKey()) return;
    setLoading(true);
    setError('');
    try {
      const [a, authz] = await Promise.all([api.agents(), api.authorizations()]);
      setAgents(a.data);
      setAuthorizations(authz.data);
      const agentId = selectedAgent || a.data[0]?.id;
      if (agentId) {
        setSelectedAgent(agentId);
        const led = await api.ledger(agentId);
        setLedger(led.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    if (apiKey) refresh();
  }, [apiKey, refresh]);

  function saveKey() {
    const val = apiKeyInput.trim();
    if (!val) return;
    setApiKey(val);
    setApiKeyState(val);
  }

  function signOut() {
    clearApiKey();
    setApiKeyState('');
    setAgents([]);
    setAuthorizations([]);
    setLedger([]);
    setInitialLoad(true);
  }

  if (!apiKey) {
    return (
      <div className="login-layout">
        <div className="login-left">
          <div className="login-brand">
            <IconLogo />
            <h1>AgentPay</h1>
            <p>Spending controls for AI agents — budgets, policies, approvals, and a full audit ledger.</p>
            <div className="login-features">
              <div className="login-feature"><span className="login-feature-dot" />Daily budget caps per agent</div>
              <div className="login-feature"><span className="login-feature-dot" />Merchant allowlists &amp; velocity limits</div>
              <div className="login-feature"><span className="login-feature-dot" />Human-in-the-loop approvals</div>
            </div>
          </div>
        </div>
        <div className="login-right">
          <div className="login-card">
            <h2>Sign in</h2>
            <p className="login-subtitle">Paste your test API key from <code>npm run seed</code></p>
            <label className="field-label" htmlFor="api-key">API key</label>
            <div className="input-group">
              <input
                id="api-key"
                className="field-input input-group-field"
                type={showApiKey ? 'text' : 'password'}
                placeholder="ap_test_..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                autoComplete="off"
              />
              <button
                type="button"
                className="input-group-btn"
                onClick={() => setShowApiKey((v) => !v)}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <button className="btn btn-primary btn-full" onClick={saveKey} disabled={!apiKeyInput.trim()}>
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pending = authorizations.filter((a) => a.status === 'pending');
  const capturedTotal = authorizations
    .filter((a) => a.status === 'captured')
    .reduce((sum, a) => sum + a.amount_cents, 0);
  const blockedCount = authorizations.filter((a) => a.status === 'blocked').length;
  const recentAuth = authorizations.slice(0, 6);

  const q = search.toLowerCase();
  const filteredAuth = authorizations.filter((a) => {
    const matchesSearch =
      !q ||
      a.merchant.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q);
    const matchesFilter = authFilter === 'all' || a.status === authFilter;
    return matchesSearch && matchesFilter;
  });

  async function handleAction(action: 'approve' | 'deny' | 'capture', id: string) {
    setError('');
    try {
      if (action === 'approve') await api.approve(id);
      if (action === 'deny') await api.deny(id);
      if (action === 'capture') await api.capture(id);
      await refresh();
      const labels = { approve: 'Approved', deny: 'Denied', capture: 'Captured' };
      showToast(`Authorization ${labels[action].toLowerCase()} successfully`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      setError(msg);
      showToast(msg, 'error');
    }
  }

  async function simulateSpend() {
    if (!selectedAgent) return;
    setError('');
    setSimulating(true);
    try {
      await api.authorize(selectedAgent, {
        amount_cents: Number(simAmount),
        merchant: simMerchant,
        reason: simReason,
      });
      await refresh();
      showToast('Spend request submitted — check Approvals for the result');
      setTab('authorizations');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Authorization failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSimulating(false);
    }
  }

  function applyPreset(preset: (typeof SIM_PRESETS)[number]) {
    setSimAmount(preset.amount);
    setSimMerchant(preset.merchant);
    setSimReason(preset.reason);
  }

  const page = PAGE_META[tab];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <IconLogo />
          AgentPay
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`sidebar-link ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon className="sidebar-icon" />
              <span className="sidebar-link-label">{label}</span>
              {id === 'authorizations' && pending.length > 0 && (
                <span className="nav-badge">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="dev-mode-badge">Test environment</span>
          <button className="sidebar-signout" onClick={signOut}>
            <IconSignOut />
            Sign out
          </button>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`mobile-nav-link ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon className="mobile-nav-icon" />
            <span>{label}</span>
            {id === 'authorizations' && pending.length > 0 && (
              <span className="mobile-nav-badge">{pending.length}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="test-mode-pill">Test mode</span>
            <div className="search-box">
              <IconSearch className="search-icon" />
              <input
                placeholder="Search merchants, reasons…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search"
              />
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
              <IconRefresh className={loading ? 'spin' : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {tab !== 'simulate' && (
              <button className="btn btn-primary" onClick={() => setTab('simulate')}>
                <IconPlay />
                Simulate spend
              </button>
            )}
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <h1>{page.title}</h1>
            <p className="page-description">{page.description}</p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <span>{error}</span>
              <button className="alert-dismiss" onClick={() => setError('')} aria-label="Dismiss">
                <IconX />
              </button>
            </div>
          )}

          {tab === 'overview' && (
            <>
              {initialLoad ? (
                <MetricsSkeleton />
              ) : (
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-label">Active agents</span>
                    <span className="metric-value">{agents.filter((a) => a.status === 'active').length}</span>
                    <span className="metric-delta">{agents.length} total configured</span>
                  </div>
                  <div className={`metric-card${pending.length ? ' highlight' : ''}`}>
                    <span className="metric-label">Pending approvals</span>
                    <span className="metric-value">{pending.length}</span>
                    <span className="metric-delta">
                      {pending.length ? 'Needs your review' : 'All clear'}
                    </span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Captured spend</span>
                    <span className="metric-value">{formatMoney(capturedTotal)}</span>
                    <span className="metric-delta">Lifetime captured</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-label">Blocked requests</span>
                    <span className="metric-value">{blockedCount}</span>
                    <span className="metric-delta">Policy enforcement</span>
                  </div>
                </div>
              )}

              <div className="split-panels">
                <div className="panel">
                  <div className="panel-header">
                    <h3>Recent authorizations</h3>
                    <button className="panel-link" onClick={() => setTab('authorizations')}>
                      View all
                    </button>
                  </div>
                  <div className="panel-body">
                    {initialLoad ? (
                      <div className="panel-skeleton">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="activity-item">
                            <Skeleton className="skeleton-avatar" />
                            <div style={{ flex: 1 }}>
                              <Skeleton className="skeleton-text-sm" />
                              <Skeleton className="skeleton-text-xs" />
                            </div>
                            <Skeleton className="skeleton-text-sm skeleton-w60" />
                          </div>
                        ))}
                      </div>
                    ) : recentAuth.length === 0 ? (
                      <div className="empty-state">
                        <h3>No activity yet</h3>
                        <p>Simulate a spend request to see authorizations here.</p>
                        <button className="btn btn-primary btn-sm empty-cta" onClick={() => setTab('simulate')}>
                          <IconPlay />
                          Simulate spend
                        </button>
                      </div>
                    ) : (
                      <ul className="activity-list">
                        {recentAuth.map((a) => (
                          <li key={a.id} className="activity-item">
                            <div className={`activity-icon ${a.status}`}>{activityIcon(a.status)}</div>
                            <div className="activity-content">
                              <div className="activity-title">{a.merchant}</div>
                              <div className="activity-meta">{a.reason} · {formatDate(a.created_at)}</div>
                            </div>
                            <div className="activity-amount">{formatMoney(a.amount_cents)}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h3>Agent budgets</h3>
                    <button className="panel-link" onClick={() => setTab('agents')}>Manage</button>
                  </div>
                  <div className="panel-body">
                    {initialLoad ? (
                      <div className="panel-skeleton">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="agent-summary-item">
                            <Skeleton className="skeleton-text-sm" />
                            <Skeleton className="skeleton-bar" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      agents.map((a) => {
                        const spent = authorizations
                          .filter((x) => x.agent_id === a.id && x.status === 'captured')
                          .reduce((s, x) => s + x.amount_cents, 0);
                        const pct = Math.min(100, (spent / a.daily_budget_cents) * 100);
                        const level = budgetLevel(pct);
                        return (
                          <div key={a.id} className="agent-summary-item">
                            <div className="agent-summary-name">{a.name}</div>
                            <div className="agent-summary-stats">
                              <div>
                                Spent today
                                <strong>{formatMoney(spent)}</strong>
                              </div>
                              <div>
                                Daily limit
                                <strong>{formatMoney(a.daily_budget_cents)}</strong>
                              </div>
                            </div>
                            <div className="budget-bar">
                              <div
                                className={`budget-bar-fill budget-bar-${level}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'agents' && (
            initialLoad ? (
              <TableSkeleton rows={3} cols={5} />
            ) : (
              <div className="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Daily budget</th>
                      <th>Approval threshold</th>
                      <th>Allowlist</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.name}</strong>
                          <div className="resource-id">{a.id}</div>
                        </td>
                        <td>{formatMoney(a.daily_budget_cents)}</td>
                        <td>{formatMoney(a.approval_threshold_cents)}</td>
                        <td>
                          {a.merchant_allowlist.length ? (
                            <div className="tag-list">
                              {a.merchant_allowlist.map((m) => (
                                <span key={m} className="tag">{m}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="muted">Any merchant</span>
                          )}
                        </td>
                        <td><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'authorizations' && (
            <>
              <div className="filter-bar">
                {AUTH_FILTERS.map(({ id, label }) => {
                  const count = id === 'all'
                    ? authorizations.length
                    : authorizations.filter((a) => a.status === id).length;
                  return (
                    <button
                      key={id}
                      className={`filter-pill ${authFilter === id ? 'active' : ''}`}
                      onClick={() => setAuthFilter(id)}
                    >
                      {label}
                      <span className="filter-count">{count}</span>
                    </button>
                  );
                })}
              </div>
              {initialLoad ? (
                <TableSkeleton rows={5} cols={6} />
              ) : (
                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Amount</th>
                        <th>Merchant</th>
                        <th>Reason</th>
                        <th>Policy</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuth.length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            <div className="empty-state">
                              <h3>No matching authorizations</h3>
                              <p>Try a different search or simulate a new spend request.</p>
                              <button className="btn btn-primary btn-sm empty-cta" onClick={() => setTab('simulate')}>
                                <IconPlay />
                                Simulate spend
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredAuth.map((a) => (
                          <tr key={a.id}>
                            <td><strong>{formatMoney(a.amount_cents)}</strong></td>
                            <td>{a.merchant}</td>
                            <td>{a.reason}</td>
                            <td><span className="muted">{a.policy_message}</span></td>
                            <td><StatusBadge status={a.status} /></td>
                            <td className="actions">
                              {a.status === 'pending' && (
                                <>
                                  <button className="btn btn-sm btn-primary" onClick={() => handleAction('approve', a.id)}>Approve</button>
                                  <button className="btn btn-sm btn-ghost" onClick={() => handleAction('deny', a.id)}>Deny</button>
                                </>
                              )}
                              {a.status === 'approved' && (
                                <button className="btn btn-sm btn-primary" onClick={() => handleAction('capture', a.id)}>Capture</button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'ledger' && (
            <>
              <div className="toolbar" style={{ marginBottom: 20 }}>
                <label className="field-label" htmlFor="ledger-agent">Filter by agent</label>
                <select
                  id="ledger-agent"
                  className="field-input field-select"
                  style={{ marginBottom: 0 }}
                  value={selectedAgent}
                  onChange={async (e) => {
                    const id = e.target.value;
                    setSelectedAgent(id);
                    const led = await api.ledger(id);
                    setLedger(led.data);
                  }}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              {initialLoad ? (
                <TableSkeleton rows={4} cols={4} />
              ) : (
                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Event</th>
                        <th>Amount</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="empty-state">
                              <h3>No ledger entries</h3>
                              <p>Events appear here as agents request and capture spend.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        ledger.map((e) => (
                          <tr key={e.id}>
                            <td>{formatDate(e.created_at)}</td>
                            <td><code>{e.type}</code></td>
                            <td>{formatMoney(e.amount_cents)}</td>
                            <td>{e.description}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'simulate' && (
            <div className="simulate-layout">
              <div className="preset-cards">
                <h4 className="preset-heading">Quick scenarios</h4>
                <div className="preset-grid">
                  {SIM_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`preset-card preset-${preset.variant}`}
                      onClick={() => applyPreset(preset)}
                    >
                      <span className="preset-label">{preset.label}</span>
                      <span className="preset-outcome">{preset.outcome}</span>
                      <span className="preset-detail">
                        {formatMoney(Number(preset.amount))} · {preset.merchant}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-card">
                <h3>Simulate agent spend request</h3>
                <p className="form-hint">
                  Pick a preset above or customize the fields below, then submit to test the policy engine.
                </p>
                <label className="field-label" htmlFor="sim-agent">Agent</label>
                <select
                  id="sim-agent"
                  className="field-input"
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <label className="field-label" htmlFor="sim-amount">Amount (cents)</label>
                <input
                  id="sim-amount"
                  className="field-input"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                />
                <label className="field-label" htmlFor="sim-merchant">Merchant</label>
                <input
                  id="sim-merchant"
                  className="field-input"
                  value={simMerchant}
                  onChange={(e) => setSimMerchant(e.target.value)}
                />
                <label className="field-label" htmlFor="sim-reason">Reason</label>
                <input
                  id="sim-reason"
                  className="field-input"
                  value={simReason}
                  onChange={(e) => setSimReason(e.target.value)}
                />
                <button
                  className="btn btn-primary btn-full"
                  onClick={simulateSpend}
                  disabled={simulating || !selectedAgent}
                >
                  {simulating ? 'Submitting…' : 'Request authorization'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? <IconCheck className="toast-icon" /> : <IconX className="toast-icon" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
