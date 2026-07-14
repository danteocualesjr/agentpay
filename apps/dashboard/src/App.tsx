import { useCallback, useEffect, useRef, useState } from 'react';
import { api, clearApiKey, getApiKey, setApiKey, type Agent, type Authorization, type LedgerEntry } from './api';
import {
  IconAgents,
  IconClose,
  IconCopy,
  IconEmpty,
  IconEye,
  IconEyeOff,
  IconHome,
  IconLedger,
  IconLogo,
  IconLogout,
  IconMetricAgents,
  IconMetricBlocked,
  IconMetricPending,
  IconMetricSpend,
  IconPlay,
  IconRefresh,
  IconSearch,
  IconShield,
} from './icons';

type Tab = 'overview' | 'agents' | 'authorizations' | 'ledger' | 'simulate';

const NAV: { id: Tab; label: string; icon: typeof IconHome; shortcut: string }[] = [
  { id: 'overview', label: 'Home', icon: IconHome, shortcut: '1' },
  { id: 'agents', label: 'Agents', icon: IconAgents, shortcut: '2' },
  { id: 'authorizations', label: 'Approvals', icon: IconShield, shortcut: '3' },
  { id: 'ledger', label: 'Audit log', icon: IconLedger, shortcut: '4' },
  { id: 'simulate', label: 'Simulate', icon: IconPlay, shortcut: '5' },
];

const TAB_BY_SHORTCUT = Object.fromEntries(NAV.map((n) => [n.shortcut, n.id])) as Record<string, Tab>;

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

const AVATAR_COLORS = [
  'avatar-sky', 'avatar-indigo', 'avatar-violet', 'avatar-emerald', 'avatar-amber', 'avatar-rose',
];

function agentInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AgentAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`agent-avatar ${avatarColor(name)} agent-avatar-${size}`} aria-hidden="true">
      {agentInitials(name)}
    </span>
  );
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

function ledgerEventVariant(type: string) {
  if (type.includes('approved') || type.includes('captured')) return 'success';
  if (type.includes('requested')) return 'info';
  if (type.includes('blocked') || type.includes('denied')) return 'danger';
  return 'neutral';
}

function formatEventType(type: string) {
  return type.replace(/_/g, ' ');
}

function policyDecisionVariant(decision: string) {
  if (decision === 'auto_approved') return 'success';
  if (decision === 'requires_approval') return 'warning';
  if (decision === 'blocked') return 'danger';
  return 'neutral';
}

function formatPolicyDecision(decision: string) {
  return decision.replace(/_/g, ' ');
}

function ledgerDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(d);
}

function groupLedgerByDate(entries: LedgerEntry[]) {
  const groups: { label: string; entries: LedgerEntry[] }[] = [];
  let currentLabel = '';
  for (const entry of entries) {
    const label = ledgerDateLabel(entry.created_at);
    if (label !== currentLabel) {
      groups.push({ label, entries: [entry] });
      currentLabel = label;
    } else {
      groups[groups.length - 1].entries.push(entry);
    }
  }
  return groups;
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

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="empty-state">
      <IconEmpty className="empty-icon" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button type="button" className="btn btn-primary empty-state-cta" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

function CopyIdButton({ id, onCopy }: { id: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      onCopy();
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      type="button"
      className="copy-id-btn"
      onClick={copy}
      title="Copy ID"
      aria-label={`Copy ID ${id}`}
    >
      {copied ? 'Copied' : <IconCopy />}
    </button>
  );
}

export default function App() {
  const [apiKeyInput, setApiKeyInput] = useState('');
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [simAmount, setSimAmount] = useState('499');
  const [simMerchant, setSimMerchant] = useState('api.search.io');
  const [simReason, setSimReason] = useState('Paid search API query batch');
  const [simulating, setSimulating] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [dismissedError, setDismissedError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
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
      setDismissedError('');
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, [selectedAgent]);

  useEffect(() => {
    if (apiKey) refresh();
  }, [apiKey, refresh]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      if (e.key === '/' && !inField) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === 'Escape' && search) {
        setSearch('');
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [search]);

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
            <div className="input-with-toggle">
              <input
                id="api-key"
                className="field-input"
                placeholder="ap_test_..."
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                autoFocus
              />
              <button
                type="button"
                className="input-toggle-btn"
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
    setError('');
    setDismissedError('');
    const key = `${action}-${id}`;
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
    setActivePreset(preset.label);
  }

  const denyTarget = confirmDenyId
    ? authorizations.find((a) => a.id === confirmDenyId)
    : null;

  const captureTarget = confirmCaptureId
    ? authorizations.find((a) => a.id === confirmCaptureId)
    : null;

  const ledgerGroups = groupLedgerByDate(ledger);

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));
  const agentName = (id: string) => agentMap[id]?.name ?? id.slice(0, 8);

  const page = PAGE_META[tab];
  const initialLoad = loading && agents.length === 0;
  const showError = error && error !== dismissedError;
  const simAmountPreview = Number(simAmount) > 0 ? formatMoney(Number(simAmount)) : null;
  const hasActiveFilters = statusFilter !== 'all' || search.length > 0;
  const showSearchKbd = !search && !searchFocused;

  return (
    <div className="shell">
      {toast && (
        <div className={`toast toast-${toast.type}`} role="status">
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-dismiss"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            <IconClose />
          </button>
        </div>
      )}

      <aside className="sidebar">
        <div className="sidebar-brand">
          <IconLogo />
          AgentPay
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV.map(({ id, label, icon: Icon, shortcut }) => (
            <button
              key={id}
              className={`sidebar-link ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon className="sidebar-icon" />
              <span className="sidebar-link-label">{label}</span>
              <kbd className="nav-shortcut" aria-hidden="true">{shortcut}</kbd>
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
            <div className={`search-box${search ? ' has-value' : ''}`}>
              <IconSearch className="search-icon" />
              <input
                ref={searchInputRef}
                placeholder="Search merchants, reasons…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                aria-label="Search"
              />
              {search ? (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => {
                    setSearch('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <IconClose />
                </button>
              ) : showSearchKbd ? (
                <kbd className="search-kbd" aria-hidden="true">/</kbd>
              ) : null}
            </div>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="btn btn-ghost btn-icon shortcuts-btn"
              onClick={() => setShowShortcuts(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <IconHelp />
            </button>
            <button className="btn btn-ghost" onClick={refresh} disabled={loading}>
              <IconRefresh className={loading ? 'spin' : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            {lastRefreshed && (
              <span className="last-refreshed" title={formatDate(lastRefreshed.toISOString())}>
                Updated {formatRelative(lastRefreshed.toISOString())}
              </span>
            )}
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

          {showError && (
            <div className="alert alert-error alert-dismissible" role="alert">
              <span>{error}</span>
              <button
                type="button"
                className="alert-dismiss"
                onClick={() => setDismissedError(error)}
                aria-label="Dismiss error"
              >
                <IconClose />
              </button>
            </div>
          )}

          {tab === 'overview' && pending.length > 0 && (
            <div className="pending-banner">
              <div className="pending-banner-text">
                <strong>{pending.length} pending approval{pending.length !== 1 ? 's' : ''}</strong>
                <span>Review authorization requests waiting for your decision.</span>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => setTab('authorizations')}>
                Review now
              </button>
            </div>
          )}

          <div key={tab} className="page-content">
          {tab === 'overview' && (
            <>
              {initialLoad ? (
                <MetricsSkeleton />
              ) : (
                <div className="metrics-row">
                  <div className="metric-card">
                    <div className="metric-header">
                      <span className="metric-icon metric-icon-agents"><IconMetricAgents /></span>
                      <span className="metric-label">Active agents</span>
                    </div>
                    <span className="metric-value">{agents.filter((a) => a.status === 'active').length}</span>
                    <span className="metric-delta">{agents.length} total configured</span>
                  </div>
                  <div className={`metric-card${pending.length ? ' highlight' : ''}`}>
                    <div className="metric-header">
                      <span className="metric-icon metric-icon-pending"><IconMetricPending /></span>
                      <span className="metric-label">Pending approvals</span>
                    </div>
                    <span className="metric-value">{pending.length}</span>
                    <span className="metric-delta">
                      {pending.length ? 'Needs your review' : 'All clear'}
                    </span>
                  </div>
                  <div className="metric-card">
                    <div className="metric-header">
                      <span className="metric-icon metric-icon-spend"><IconMetricSpend /></span>
                      <span className="metric-label">Captured spend</span>
                    </div>
                    <span className="metric-value">{formatMoney(capturedTotal)}</span>
                    <span className="metric-delta">Lifetime captured</span>
                  </div>
                  <div className="metric-card">
                    <div className="metric-header">
                      <span className="metric-icon metric-icon-blocked"><IconMetricBlocked /></span>
                      <span className="metric-label">Blocked requests</span>
                    </div>
                    <span className="metric-value">{blockedCount}</span>
                    <span className="metric-delta">Policy enforcement</span>
                  </button>
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
                        action={{ label: 'Simulate spend', onClick: () => setTab('simulate') }}
                      />
                    ) : (
                      <ul className="activity-list">
                        {recentAuth.map((a) => (
                          <li key={a.id}>
                            <button
                              type="button"
                              className="activity-item activity-item-clickable"
                              onClick={() => {
                                setTab('authorizations');
                                setStatusFilter(a.status);
                                setSearch(a.merchant);
                              }}
                            >
                              <div className={`activity-icon ${a.status}`}>{activityIcon(a.status)}</div>
                              <div className="activity-content">
                                <div className="activity-title">{a.merchant}</div>
                                <div className="activity-meta">{a.reason} · {formatRelative(a.created_at)}</div>
                              </div>
                              <div className="activity-amount">{formatMoney(a.amount_cents)}</div>
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
                        <button
                          key={a.id}
                          type="button"
                          className="agent-summary-item agent-summary-clickable"
                          onClick={() => goToLedgerForAgent(a.id)}
                          title={`View ${a.name} audit log`}
                        >
                          <div className="agent-summary-name">
                            <AgentAvatar name={a.name} size="sm" />
                            {a.name}
                          </div>
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
                          <div className="budget-pct">{pct.toFixed(0)}% used · View ledger</div>
                        </button>
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
                            <CopyIdButton id={a.id} onCopy={() => showToast('ID copied')} />
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
              </div>
              {!initialLoad && (
                <div className="results-bar">
                  <p className="results-summary">
                    Showing {filteredAuth.length} of {authorizations.length} authorization{authorizations.length !== 1 ? 's' : ''}
                    {search && <> matching &ldquo;{search}&rdquo;</>}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="clear-filters-btn"
                      onClick={() => {
                        setStatusFilter('all');
                        setSearch('');
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
              {initialLoad ? (
                <TableSkeleton cols={8} />
              ) : (
                <div className="table-card table-card-sticky">
                  <table>
                    <thead>
                      <tr>
                        <th>Amount</th>
                        <th>Agent</th>
                        <th>Merchant</th>
                        <th>Reason</th>
                        <th>Created</th>
                        <th>Policy</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuth.length === 0 ? (
                        <tr>
                          <td colSpan={8}>
                            <EmptyState
                              title="No matching authorizations"
                              description="Try a different search or simulate a new spend request."
                              action={
                                hasActiveFilters
                                  ? { label: 'Clear filters', onClick: () => { setStatusFilter('all'); setSearch(''); } }
                                  : { label: 'Simulate spend', onClick: () => setTab('simulate') }
                              }
                            />
                          </td>
                        </tr>
                      ) : (
                        filteredAuth.map((a) => (
                          <tr key={a.id}>
                            <td><strong>{formatMoney(a.amount_cents)}</strong></td>
                            <td>
                              <div className="agent-cell agent-cell-compact">
                                <AgentAvatar name={agentName(a.agent_id)} size="sm" />
                                <span>{agentName(a.agent_id)}</span>
                              </div>
                            </td>
                            <td>{a.merchant}</td>
                            <td className="cell-truncate" title={a.reason}>{a.reason}</td>
                            <td>
                              <span className="muted" title={formatDate(a.created_at)}>
                                {formatRelative(a.created_at)}
                              </span>
                            </td>
                            <td>
                              <span className="muted cell-truncate" title={a.policy_message ?? undefined}>
                                {a.policy_message}
                              </span>
                              <span className={`policy-chip policy-chip-${policyDecisionVariant(a.policy_decision)}`}>
                                {formatPolicyDecision(a.policy_decision)}
                              </span>
                            </td>
                            <td><StatusBadge status={a.status} /></td>
                            <td className="actions">
                              {a.status === 'pending' && (
                                <>
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleAction('approve', a.id)}
                                    disabled={actionLoading === `approve-${a.id}`}
                                  >
                                    {actionLoading === `approve-${a.id}` ? 'Approving…' : 'Approve'}
                                  </button>
                                  <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => handleAction('deny', a.id)}
                                    disabled={actionLoading === `deny-${a.id}`}
                                  >
                                    {actionLoading === `deny-${a.id}` ? 'Denying…' : 'Deny'}
                                  </button>
                                </>
                              )}
                              {a.status === 'approved' && (
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleAction('capture', a.id)}
                                  disabled={actionLoading === `capture-${a.id}`}
                                >
                                  {actionLoading === `capture-${a.id}` ? 'Capturing…' : 'Capture'}
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
                <div className="table-card table-card-sticky">
                  <table>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Event</th>
                        <th>Amount</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    {ledger.length === 0 ? (
                      <tbody>
                        <tr>
                          <td colSpan={4}>
                            <EmptyState
                              title="No ledger entries"
                              description="Events appear here as agents request and capture spend."
                              action={{ label: 'Simulate spend', onClick: () => setTab('simulate') }}
                            />
                          </td>
                        </tr>
                      </tbody>
                    ) : (
                      ledgerGroups.map((group) => (
                        <tbody key={group.label} className="ledger-group">
                          <tr className="ledger-date-row">
                            <td colSpan={4}>
                              <span className="ledger-date-label">{group.label}</span>
                              <span className="ledger-date-count">{group.entries.length} event{group.entries.length !== 1 ? 's' : ''}</span>
                            </td>
                          </tr>
                          {group.entries.map((e) => (
                            <tr key={e.id}>
                              <td>
                                <span title={formatDate(e.created_at)}>{formatRelative(e.created_at)}</span>
                              </td>
                              <td>
                                <span className={`event-badge event-badge-${ledgerEventVariant(e.type)}`}>
                                  {formatEventType(e.type)}
                                </span>
                              </td>
                              <td>{formatMoney(e.amount_cents)}</td>
                              <td>{e.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      ))
                    )}
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
                      className={`preset-card preset-${preset.variant}${activePreset === preset.label ? ' selected' : ''}`}
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
                  {simAmountPreview && <span className="amount-preview">{simAmountPreview}</span>}
                </label>
                <input
                  id="sim-amount"
                  className="field-input"
                  value={simAmount}
                  onChange={(e) => {
                    setSimAmount(e.target.value);
                    setActivePreset(null);
                  }}
                />
                <label className="field-label" htmlFor="sim-merchant">Merchant</label>
                <input
                  id="sim-merchant"
                  className="field-input"
                  value={simMerchant}
                  onChange={(e) => {
                    setSimMerchant(e.target.value);
                    setActivePreset(null);
                  }}
                />
                <label className="field-label" htmlFor="sim-reason">Reason</label>
                <input
                  id="sim-reason"
                  className="field-input"
                  value={simReason}
                  onChange={(e) => {
                    setSimReason(e.target.value);
                    setActivePreset(null);
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
