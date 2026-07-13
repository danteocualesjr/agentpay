import { useCallback, useEffect, useState } from 'react';
import { api, getApiKey, setApiKey, type Agent, type Authorization, type LedgerEntry } from './api';
import {
  IconAgents,
  IconArrowUpRight,
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
  { id: 'overview', label: 'Overview', icon: IconHome },
  { id: 'agents', label: 'Agents', icon: IconAgents },
  { id: 'authorizations', label: 'Approvals', icon: IconShield },
  { id: 'ledger', label: 'Audit log', icon: IconLedger },
  { id: 'simulate', label: 'Simulate', icon: IconPlay },
];

const PAGE_META: Record<Tab, { title: string; description: string }> = {
  overview: {
    title: 'Overview',
    description: 'Live view of agent spending, approvals, and policy enforcement.',
  },
  agents: {
    title: 'Agents',
    description: 'AI agents with scoped budgets, merchant allowlists, and approval thresholds.',
  },
  authorizations: {
    title: 'Approvals',
    description: 'Review, approve, deny, and capture agent spend requests.',
  },
  ledger: {
    title: 'Audit log',
    description: 'Immutable record of every authorization attempt and capture.',
  },
  simulate: {
    title: 'Simulate',
    description: 'Exercise the policy engine with sample spend requests.',
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

function feedGlyph(status: string) {
  if (status === 'approved') return '✓';
  if (status === 'captured') return '$';
  if (status === 'pending') return '•';
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
      <div className="login">
        <div className="login-card">
          <span className="login-mark"><IconLogo /></span>
          <h1><span>AgentPay</span></h1>
          <p className="login-tagline">
            Spending controls for AI agents. Budgets, policies, approvals, and a complete audit ledger.
          </p>
          <div className="login-form">
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
          <p className="login-hint">Grab a test key with <code>npm run seed</code></p>
        </div>
      </div>
    );
  }

  const pending = authorizations.filter((a) => a.status === 'pending');
  const approvedCount = authorizations.filter((a) => a.status === 'approved').length;
  const blockedCount = authorizations.filter((a) => a.status === 'blocked').length;
  const capturedTotal = authorizations
    .filter((a) => a.status === 'captured')
    .reduce((sum, a) => sum + a.amount_cents, 0);
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
    <div className="app">
      <header className="topnav">
        <div className="brand">
          <IconLogo />
          AgentPay
          <span className="brand-env">Test</span>
        </div>

        <nav className="nav-tabs">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-tab ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon />
              <span className="nav-tab-label">{label}</span>
              {id === 'authorizations' && pending.length > 0 && (
                <span className="nav-tab-badge">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="topnav-actions">
          <div className="search-box">
            <IconSearch />
            <input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
            <IconRefresh />
            {loading ? 'Syncing…' : 'Refresh'}
          </button>
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
            <div className="hero">
              <div>
                <div className="hero-label">Captured spend</div>
                <div className="hero-value">{formatMoney(capturedTotal)}</div>
                <div className="hero-sub">
                  Across {agents.length} agent{agents.length === 1 ? '' : 's'} · {authorizations.length} authorization
                  {authorizations.length === 1 ? '' : 's'} evaluated
                </div>
              </div>
              <div className="hero-side">
                <div>
                  <div className="hero-stat-label">Pending review</div>
                  <div className={`hero-stat-value${pending.length ? ' warn' : ''}`}>{pending.length}</div>
                </div>
                <div>
                  <div className="hero-stat-label">Blocked by policy</div>
                  <div className={`hero-stat-value${blockedCount ? ' danger' : ''}`}>{blockedCount}</div>
                </div>
              </div>
            </div>

            <div className="metrics">
              <div className="metric">
                <div className="metric-label"><span className="metric-dot teal" />Active agents</div>
                <div className="metric-value">{agents.filter((a) => a.status === 'active').length}</div>
              </div>
              <div className="metric">
                <div className="metric-label"><span className="metric-dot blue" />Ready to capture</div>
                <div className="metric-value">{approvedCount}</div>
              </div>
              <div className="metric">
                <div className="metric-label"><span className="metric-dot amber" />Awaiting approval</div>
                <div className="metric-value">{pending.length}</div>
              </div>
              <div className="metric">
                <div className="metric-label"><span className="metric-dot rose" />Policy blocks</div>
                <div className="metric-value">{blockedCount}</div>
              </div>
            </div>

            <div className="panels">
              <div className="panel">
                <div className="panel-header">
                  <h3>Recent activity</h3>
                  <button className="panel-link" onClick={() => setTab('authorizations')}>
                    View all <IconArrowUpRight />
                  </button>
                </div>
                {recentAuth.length === 0 ? (
                  <div className="empty-state">
                    <h3>No activity yet</h3>
                    <p>Simulate a spend request to see authorizations flow through the policy engine.</p>
                  </div>
                ) : (
                  <ul className="feed">
                    {recentAuth.map((a) => (
                      <li key={a.id} className="feed-item">
                        <span className={`feed-status ${a.status}`}>{feedGlyph(a.status)}</span>
                        <div className="feed-body">
                          <div className="feed-title">{a.merchant}</div>
                          <div className="feed-meta">{a.reason} · {formatDate(a.created_at)}</div>
                        </div>
                        <span className="feed-amount">{formatMoney(a.amount_cents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Agent budgets</h3>
                  <button className="panel-link" onClick={() => setTab('agents')}>
                    Manage <IconArrowUpRight />
                  </button>
                </div>
                <div className="budget-list">
                  {agents.map((a) => {
                    const spent = authorizations
                      .filter((x) => x.agent_id === a.id && x.status === 'captured')
                      .reduce((s, x) => s + x.amount_cents, 0);
                    const pct = Math.min(100, (spent / a.daily_budget_cents) * 100);
                    return (
                      <div key={a.id} className="budget-item">
                        <div className="budget-head">
                          <span className="budget-name">{a.name}</span>
                          <span className="budget-nums">
                            <strong>{formatMoney(spent)}</strong> / {formatMoney(a.daily_budget_cents)}
                          </span>
                        </div>
                        <div className="budget-track">
                          <div className="budget-fill" style={{ width: `${pct}%` }} />
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
                      <span className="cell-strong">{a.name}</span>
                      <div className="resource-id">{a.id}</div>
                    </td>
                    <td className="cell-amount">{formatMoney(a.daily_budget_cents)}</td>
                    <td className="cell-amount">{formatMoney(a.approval_threshold_cents)}</td>
                    <td className="muted">{a.merchant_allowlist.join(', ') || 'Any merchant'}</td>
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
                      <td className="cell-amount">{formatMoney(a.amount_cents)}</td>
                      <td className="cell-strong">{a.merchant}</td>
                      <td>{a.reason}</td>
                      <td><span className="muted">{a.policy_message}</span></td>
                      <td><StatusBadge status={a.status} /></td>
                      <td className="actions">
                        {a.status === 'pending' && (
                          <>
                            <button className="btn btn-sm btn-primary" onClick={() => handleAction('approve', a.id)}>Approve</button>
                            <button className="btn btn-sm btn-danger-ghost" onClick={() => handleAction('deny', a.id)}>Deny</button>
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
            <div className="toolbar">
              <label className="field-label">Agent</label>
              <select
                className="field-input"
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
                        <td className="muted">{formatDate(e.created_at)}</td>
                        <td><code>{e.type}</code></td>
                        <td className="cell-amount">{formatMoney(e.amount_cents)}</td>
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
              Try <strong>$4.99</strong> at <code>api.search.io</code> (auto-approve),{' '}
              <strong>$89</strong> at <code>datasets.io</code> (pending review),{' '}
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
            <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={simulateSpend}>
              <IconPlay />
              Request authorization
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
