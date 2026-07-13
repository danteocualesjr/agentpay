import { useCallback, useEffect, useRef, useState } from 'react';
import { api, clearApiKey, getApiKey, setApiKey, type Agent, type Authorization, type LedgerEntry } from './api';
import {
  IconAgents,
  IconAlert,
  IconBlock,
  IconCheck,
  IconClock,
  IconClose,
  IconCopy,
  IconDollar,
  IconEmpty,
  IconEye,
  IconEyeOff,
  IconHome,
  IconLedger,
  IconLogo,
  IconLogout,
  IconPlay,
  IconRefresh,
  IconSearch,
  IconShield,
  IconUsers,
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

const SIM_PRESETS = [
  {
    label: 'Auto-approve',
    hint: '$4.99 · allowed merchant',
    amount: '499',
    merchant: 'api.search.io',
    reason: 'Paid search API query batch',
    variant: 'success' as const,
  },
  {
    label: 'Needs approval',
    hint: '$89 · over threshold',
    amount: '8900',
    merchant: 'datasets.io',
    reason: 'Premium dataset download',
    variant: 'warning' as const,
  },
  {
    label: 'Blocked',
    hint: '$200 · not on allowlist',
    amount: '20000',
    merchant: 'unknown.shop',
    reason: 'Unauthorized merchant purchase',
    variant: 'danger' as const,
  },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'captured', label: 'Captured' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'denied', label: 'Denied' },
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

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

function budgetBarLevel(pct: number) {
  if (pct >= 90) return 'critical';
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

function MetricsSkeleton() {
  return (
    <div className="metrics-row">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="metric-card skeleton-card">
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton skeleton-value" />
          <div className="skeleton skeleton-text" style={{ width: '45%' }} />
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
              <th key={i}><div className="skeleton skeleton-text" style={{ width: '70%' }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><div className="skeleton skeleton-text" style={{ width: c === 0 ? '80%' : '55%' }} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <IconEmpty className="empty-icon" />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      className={`copy-btn ${copied ? 'copied' : ''}`}
      onClick={copy}
      title={copied ? 'Copied!' : label}
      aria-label={copied ? 'Copied' : label}
    >
      {copied ? <IconCheck /> : <IconCopy />}
    </button>
  );
}

export default function App() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKeyState] = useState(getApiKey());
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dismissedError, setDismissedError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [simAmount, setSimAmount] = useState('499');
  const [simMerchant, setSimMerchant] = useState('api.search.io');
  const [simReason, setSimReason] = useState('Paid search API query batch');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(SIM_PRESETS[0].label);
  const [simulating, setSimulating] = useState(false);
  const [pendingBannerDismissed, setPendingBannerDismissed] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    if (!getApiKey()) return;
    setLoading(true);
    setError('');
    setDismissedError('');
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
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedAgent]);

  useEffect(() => {
    if (apiKey) refresh();
  }, [apiKey, refresh]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearch('');
        searchRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
            <div className="field-with-action">
              <input
                id="api-key"
                className="field-input"
                type={showApiKey ? 'text' : 'password'}
                placeholder="ap_test_..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                autoFocus
              />
              <button
                type="button"
                className="field-action-btn"
                onClick={() => setShowApiKey((v) => !v)}
                aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
              >
                {showApiKey ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
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
  const filteredAuth = authorizations.filter((a) => {
    const matchesSearch =
      !q ||
      a.merchant.toLowerCase().includes(q) ||
      a.reason.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleAction(action: 'approve' | 'deny' | 'capture', id: string) {
    const key = `${action}:${id}`;
    if (actionLoading) return;
    setError('');
    setActionLoading(key);
    try {
      if (action === 'approve') await api.approve(id);
      if (action === 'deny') await api.deny(id);
      if (action === 'capture') await api.capture(id);
      const labels = { approve: 'Approved', deny: 'Denied', capture: 'Captured' };
      showToast(`${labels[action]} successfully`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  function viewAuthorization(auth: Authorization) {
    setTab('authorizations');
    setStatusFilter(auth.status);
    setSearch(auth.merchant);
    searchRef.current?.focus();
  }

  async function simulateSpend() {
    if (!selectedAgent) return;
    setError('');
    setSimulating(true);
    try {
      const result = await api.authorize(selectedAgent, {
        amount_cents: Number(simAmount),
        merchant: simMerchant,
        reason: simReason,
      });
      showToast(`Authorization ${result.status}`);
      await refresh();
      setTab('authorizations');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authorization failed');
    } finally {
      setSimulating(false);
    }
  }

  function applyPreset(preset: (typeof SIM_PRESETS)[number]) {
    setSimAmount(preset.amount);
    setSimMerchant(preset.merchant);
    setSimReason(preset.reason);
    setSelectedPreset(preset.label);
  }

  const page = PAGE_META[tab];
  const initialLoad = loading && agents.length === 0;
  const visibleError = error && error !== dismissedError;
  const simAmountCents = Number(simAmount) || 0;

  return (
    <div className="shell">
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status">
          {toast.message}
        </div>
      )}

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
              aria-current={tab === id ? 'page' : undefined}
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
          <button className="btn btn-ghost btn-sm sign-out-btn" onClick={signOut}>
            <IconLogout />
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
            aria-current={tab === id ? 'page' : undefined}
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
                ref={searchRef}
                placeholder="Search merchants, reasons…  /"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search"
              />
              {search && (
                <button
                  className="search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <IconClose />
                </button>
              )}
            </div>
          </div>
          <div className="topbar-actions">
            {lastRefreshed && (
              <span className="last-refreshed" title={formatDate(lastRefreshed.toISOString())}>
                <IconClock />
                Updated {formatRelative(lastRefreshed.toISOString())}
              </span>
            )}
            <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
              <IconRefresh className={loading ? 'spin' : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {tab !== 'simulate' && (
              <button className="btn btn-primary" onClick={() => setTab('simulate')}>
                <IconPlay />
                <span className="btn-label-full">Simulate spend</span>
                <span className="btn-label-short">Simulate</span>
              </button>
            )}
          </div>
        </header>

        <div className="content">
          <div className="page-header">
            <h1>{page.title}</h1>
            <p className="page-description">{page.description}</p>
          </div>

          <div key={tab} className="page-body">

          {visibleError && (
            <div className="alert alert-error" role="alert">
              <span>{error}</span>
              <button
                className="alert-dismiss"
                onClick={() => setDismissedError(error)}
                aria-label="Dismiss error"
              >
                <IconClose />
              </button>
            </div>
          )}

          {tab === 'overview' && pending.length > 0 && !pendingBannerDismissed && (
            <div className="pending-banner" role="status">
              <div className="pending-banner-content">
                <IconAlert className="pending-banner-icon" />
                <div>
                  <strong>{pending.length} approval{pending.length !== 1 ? 's' : ''} awaiting review</strong>
                  <p>Review pending spend requests before they expire.</p>
                </div>
              </div>
              <div className="pending-banner-actions">
                <button className="btn btn-sm btn-primary" onClick={() => setTab('authorizations')}>
                  Review now
                </button>
                <button
                  className="alert-dismiss"
                  onClick={() => setPendingBannerDismissed(true)}
                  aria-label="Dismiss banner"
                >
                  <IconClose />
                </button>
              </div>
            </div>
          )}

          {tab === 'overview' && (
            <>
              {initialLoad ? (
                <MetricsSkeleton />
              ) : (
                <div className="metrics-row">
                  <div className="metric-card">
                    <div className="metric-header">
                      <span className="metric-icon metric-icon-agents"><IconUsers /></span>
                      <span className="metric-label">Active agents</span>
                    </div>
                    <span className="metric-value">{agents.filter((a) => a.status === 'active').length}</span>
                    <span className="metric-delta">{agents.length} total configured</span>
                  </div>
                  <div className={`metric-card${pending.length ? ' highlight' : ''}`}>
                    <div className="metric-header">
                      <span className="metric-icon metric-icon-pending"><IconShield /></span>
                      <span className="metric-label">Pending approvals</span>
                    </div>
                    <span className="metric-value">{pending.length}</span>
                    <span className="metric-delta">
                      {pending.length ? 'Needs your review' : 'All clear'}
                    </span>
                  </div>
                  <div className="metric-card">
                    <div className="metric-header">
                      <span className="metric-icon metric-icon-spend"><IconDollar /></span>
                      <span className="metric-label">Captured spend</span>
                    </div>
                    <span className="metric-value">{formatMoney(capturedTotal)}</span>
                    <span className="metric-delta">Lifetime captured</span>
                  </div>
                  <div className="metric-card">
                    <div className="metric-header">
                      <span className="metric-icon metric-icon-blocked"><IconBlock /></span>
                      <span className="metric-label">Blocked requests</span>
                    </div>
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
                            <div className="skeleton skeleton-avatar" />
                            <div style={{ flex: 1 }}>
                              <div className="skeleton skeleton-text" style={{ width: '50%', marginBottom: 6 }} />
                              <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : recentAuth.length === 0 ? (
                      <EmptyState
                        title="No activity yet"
                        description="Simulate a spend request to see authorizations here."
                      />
                    ) : (
                      <ul className="activity-list">
                        {recentAuth.map((a) => (
                          <li key={a.id}>
                            <button
                              type="button"
                              className="activity-item activity-item-btn"
                              onClick={() => viewAuthorization(a)}
                            >
                              <div className={`activity-icon ${a.status}`}>{activityIcon(a.status)}</div>
                              <div className="activity-content">
                                <div className="activity-title">{a.merchant}</div>
                                <div className="activity-meta">
                                  {a.reason} · {formatRelative(a.created_at)}
                                </div>
                              </div>
                              <div className="activity-right">
                                <StatusBadge status={a.status} />
                                <div className="activity-amount">{formatMoney(a.amount_cents)}</div>
                              </div>
                            </button>
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
                      const level = budgetBarLevel(pct);
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
                            <div>
                              Remaining
                              <strong>{formatMoney(Math.max(0, a.daily_budget_cents - spent))}</strong>
                            </div>
                          </div>
                          <div className="budget-bar">
                            <div className={`budget-bar-fill ${level}`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="budget-pct">{pct.toFixed(0)}% used</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'agents' && (
            initialLoad ? (
              <TableSkeleton cols={5} />
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
                          <div className="resource-id-row">
                            <span className="resource-id">{a.id}</span>
                            <CopyButton text={a.id} label="Copy agent ID" />
                          </div>
                        </td>
                        <td>{formatMoney(a.daily_budget_cents)}</td>
                        <td>{formatMoney(a.approval_threshold_cents)}</td>
                        <td>
                          <div className="allowlist-tags">
                            {a.merchant_allowlist.length
                              ? a.merchant_allowlist.map((m) => <span key={m} className="tag">{m}</span>)
                              : <span className="muted">Any merchant</span>}
                          </div>
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
                {STATUS_FILTERS.map((f) => {
                  const count = f.id === 'all'
                    ? authorizations.length
                    : authorizations.filter((a) => a.status === f.id).length;
                  return (
                    <button
                      key={f.id}
                      className={`filter-chip ${statusFilter === f.id ? 'active' : ''}`}
                      onClick={() => setStatusFilter(f.id)}
                    >
                      {f.label}
                      <span className="filter-count">{count}</span>
                    </button>
                  );
                })}
                {(search || statusFilter !== 'all') && (
                  <span className="results-summary">
                    {filteredAuth.length} of {authorizations.length} shown
                  </span>
                )}
              </div>
              {initialLoad ? (
                <TableSkeleton cols={6} />
              ) : (
                <div className="table-card table-scroll">
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
                            <EmptyState
                              title="No matching authorizations"
                              description="Try a different search or simulate a new spend request."
                            />
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
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleAction('approve', a.id)}
                                    disabled={!!actionLoading}
                                  >
                                    {actionLoading === `approve:${a.id}` ? 'Approving…' : 'Approve'}
                                  </button>
                                  <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => handleAction('deny', a.id)}
                                    disabled={!!actionLoading}
                                  >
                                    {actionLoading === `deny:${a.id}` ? 'Denying…' : 'Deny'}
                                  </button>
                                </>
                              )}
                              {a.status === 'approved' && (
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleAction('capture', a.id)}
                                  disabled={!!actionLoading}
                                >
                                  {actionLoading === `capture:${a.id}` ? 'Capturing…' : 'Capture'}
                                </button>
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
                <TableSkeleton cols={4} />
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
                            <EmptyState
                              title="No ledger entries"
                              description="Events appear here as agents request and capture spend."
                            />
                          </td>
                        </tr>
                      ) : (
                        ledger.map((e) => (
                          <tr key={e.id}>
                            <td>
                              <span title={formatDate(e.created_at)}>{formatRelative(e.created_at)}</span>
                            </td>
                            <td><code className="event-code">{e.type}</code></td>
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
                <p className="preset-label">Quick scenarios</p>
                <div className="preset-grid">
                  {SIM_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      className={`preset-card preset-${preset.variant}${selectedPreset === preset.label ? ' selected' : ''}`}
                      onClick={() => applyPreset(preset)}
                    >
                      <span className="preset-title">{preset.label}</span>
                      <span className="preset-hint">{preset.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-card">
                <h3>Simulate agent spend request</h3>
                <p className="form-hint">
                  Pick a scenario above or customize the fields below, then submit to test the policy engine.
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
                <label className="field-label" htmlFor="sim-amount">
                  Amount (cents)
                  {simAmountCents > 0 && (
                    <span className="amount-preview">= {formatMoney(simAmountCents)}</span>
                  )}
                </label>
                <input
                  id="sim-amount"
                  className="field-input"
                  type="number"
                  min="1"
                  value={simAmount}
                  onChange={(e) => {
                    setSimAmount(e.target.value);
                    setSelectedPreset(null);
                  }}
                />
                <label className="field-label" htmlFor="sim-merchant">Merchant</label>
                <input
                  id="sim-merchant"
                  className="field-input"
                  value={simMerchant}
                  onChange={(e) => {
                    setSimMerchant(e.target.value);
                    setSelectedPreset(null);
                  }}
                />
                <label className="field-label" htmlFor="sim-reason">Reason</label>
                <input
                  id="sim-reason"
                  className="field-input"
                  value={simReason}
                  onChange={(e) => {
                    setSimReason(e.target.value);
                    setSelectedPreset(null);
                  }}
                />
                <button className="btn btn-primary btn-full" onClick={simulateSpend} disabled={simulating}>
                  {simulating ? 'Submitting…' : 'Request authorization'}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
