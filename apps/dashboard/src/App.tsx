import { useCallback, useEffect, useState } from 'react';
import { api, getApiKey, setApiKey, type Agent, type Authorization, type LedgerEntry } from './api';
import {
  IconAgents,
  IconHome,
  IconLedger,
  IconLogo,
  IconPlay,
  IconRefresh,
  IconSearch,
  IconShield,
} from './icons';

type Tab = 'overview' | 'agents' | 'authorizations' | 'ledger' | 'simulate';

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

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace('_', ' ')}</span>;
}

function activityIcon(status: string) {
  if (status === 'approved') return '✓';
  if (status === 'pending') return '…';
  if (status === 'captured') return '$';
  return '✕';
}

export default function App() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [simAmount, setSimAmount] = useState('499');
  const [simMerchant, setSimMerchant] = useState('api.search.io');
  const [simReason, setSimReason] = useState('Paid search API query batch');

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
            <label className="field-label">API key</label>
            <input
              className="field-input"
              placeholder="ap_test_..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveKey()}
            />
            <button className="btn btn-primary btn-full" onClick={saveKey}>
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
  const filteredAuth = authorizations.filter(
    (a) =>
      !q ||
      a.merchant.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q),
  );

  async function handleAction(action: 'approve' | 'deny' | 'capture', id: string) {
    setError('');
    try {
      if (action === 'approve') await api.approve(id);
      if (action === 'deny') await api.deny(id);
      if (action === 'capture') await api.capture(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  }

  async function simulateSpend() {
    if (!selectedAgent) return;
    setError('');
    try {
      await api.authorize(selectedAgent, {
        amount_cents: Number(simAmount),
        merchant: simMerchant,
        reason: simReason,
      });
      await refresh();
      setTab('authorizations');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authorization failed');
    }
  }

  const page = PAGE_META[tab];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <IconLogo />
          AgentPay
        </div>
        <nav className="sidebar-nav">
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
        </div>
      </aside>

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
              />
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
              <IconRefresh />
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

          {error && <div className="alert alert-error">{error}</div>}

          {tab === 'overview' && (
            <>
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

              <div className="split-panels">
                <div className="panel">
                  <div className="panel-header">
                    <h3>Recent authorizations</h3>
                    <button className="panel-link" onClick={() => setTab('authorizations')}>
                      View all
                    </button>
                  </div>
                  <div className="panel-body">
                    {recentAuth.length === 0 ? (
                      <div className="empty-state">
                        <h3>No activity yet</h3>
                        <p>Simulate a spend request to see authorizations here.</p>
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
                    {agents.map((a) => {
                      const spent = authorizations
                        .filter((x) => x.agent_id === a.id && x.status === 'captured')
                        .reduce((s, x) => s + x.amount_cents, 0);
                      const pct = Math.min(100, (spent / a.daily_budget_cents) * 100);
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
                            <div className="budget-bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'agents' && (
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
                      <td>{a.merchant_allowlist.join(', ') || 'Any merchant'}</td>
                      <td><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'authorizations' && (
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

          {tab === 'ledger' && (
            <>
              <div className="toolbar" style={{ marginBottom: 20 }}>
                <label className="field-label">Filter by agent</label>
                <select
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
            </>
          )}

          {tab === 'simulate' && (
            <div className="form-card">
              <h3>Simulate agent spend request</h3>
              <p className="form-hint">
                Try <strong>$4.99</strong> at <code>api.search.io</code> (auto-approve),
                <strong> $89</strong> at <code>datasets.io</code> (pending),
                or <strong>$200</strong> at <code>unknown.shop</code> (blocked).
              </p>
              <label className="field-label">Agent</label>
              <select className="field-input" value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <label className="field-label">Amount (cents)</label>
              <input className="field-input" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} />
              <label className="field-label">Merchant</label>
              <input className="field-input" value={simMerchant} onChange={(e) => setSimMerchant(e.target.value)} />
              <label className="field-label">Reason</label>
              <input className="field-input" value={simReason} onChange={(e) => setSimReason(e.target.value)} />
              <button className="btn btn-primary btn-full" onClick={simulateSpend}>
                Request authorization
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
