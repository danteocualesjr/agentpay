import { useCallback, useEffect, useState } from 'react';
import { api, getApiKey, setApiKey, type Agent, type Authorization, type LedgerEntry } from './api';

type Tab = 'overview' | 'agents' | 'authorizations' | 'ledger' | 'simulate';

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

export default function App() {
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [tab, setTab] = useState<Tab>('overview');
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

  if (!apiKey) {
    return (
      <div className="login-layout">
        <div className="login-left">
          <h1>AgentPay</h1>
          <p>Spending controls for AI agents — budgets, policies, approvals, and a full audit ledger.</p>
        </div>
        <div className="login-right">
          <div className="login-card">
            <h2>Sign in</h2>
            <p className="login-subtitle">Paste your test API key from <code>npm run seed</code></p>
            <label className="field-label">API key</label>
            <input
              className="field-input"
              placeholder="ap_test_..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    setApiKey(val);
                    setApiKeyState(val);
                  }
                }
              }}
            />
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 16 }}
              onClick={() => {
                const input = document.querySelector<HTMLInputElement>('.field-input');
                const val = input?.value.trim();
                if (val) {
                  setApiKey(val);
                  setApiKeyState(val);
                }
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pending = authorizations.filter((a) => a.status === 'pending');
  const capturedToday = authorizations
    .filter((a) => a.status === 'captured')
    .reduce((sum, a) => sum + a.amount_cents, 0);

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

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">AgentPay</div>
        <nav className="sidebar-nav">
          {(['overview', 'agents', 'authorizations', 'ledger', 'simulate'] as Tab[]).map((t) => (
            <button key={t} className={`nav-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'authorizations' && pending.length > 0 && (
                <span className="nav-badge">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="test-mode-badge">Test mode</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>{tab.charAt(0).toUpperCase() + tab.slice(1)}</h1>
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        {tab === 'overview' && (
          <div className="grid-stats">
            <div className="stat-card">
              <div className="stat-label">Active agents</div>
              <div className="stat-value">{agents.filter((a) => a.status === 'active').length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending approvals</div>
              <div className="stat-value">{pending.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Captured spend</div>
              <div className="stat-value">{formatMoney(capturedToday)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total authorizations</div>
              <div className="stat-value">{authorizations.length}</div>
            </div>
          </div>
        )}

        {tab === 'agents' && (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Daily budget</th>
                  <th>Approval threshold</th>
                  <th>Allowlist</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.name}</strong><div className="muted">{a.id}</div></td>
                    <td>{formatMoney(a.daily_budget_cents)}</td>
                    <td>{formatMoney(a.approval_threshold_cents)}</td>
                    <td>{a.merchant_allowlist.join(', ') || 'Any'}</td>
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
                {authorizations.map((a) => (
                  <tr key={a.id}>
                    <td>{formatMoney(a.amount_cents)}</td>
                    <td>{a.merchant}</td>
                    <td>{a.reason}</td>
                    <td><span className="muted">{a.policy_message}</span></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="actions">
                      {a.status === 'pending' && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleAction('approve', a.id)}>Approve</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleAction('deny', a.id)}>Deny</button>
                        </>
                      )}
                      {a.status === 'approved' && (
                        <button className="btn btn-sm btn-primary" onClick={() => handleAction('capture', a.id)}>Capture</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'ledger' && (
          <>
            <div className="toolbar">
              <label className="field-label">Agent</label>
              <select
                className="field-input field-select"
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
                    <th>Time</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((e) => (
                    <tr key={e.id}>
                      <td>{formatDate(e.created_at)}</td>
                      <td><code>{e.type}</code></td>
                      <td>{formatMoney(e.amount_cents)}</td>
                      <td>{e.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'simulate' && (
          <div className="form-card">
            <h3>Simulate agent spend request</h3>
            <p className="muted">Try: $4.99 at api.search.io (auto-approve), $89 at datasets.io (pending), $200 at unknown.shop (blocked)</p>
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
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={simulateSpend}>
              Request authorization
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
