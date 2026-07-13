# AgentPay

Developer-first spending controls for AI agents — budgets, policies, approvals, and an immutable audit ledger.

## Quick start

```bash
npm install
npm run seed
npm run dev
```

- **API:** http://localhost:3002
- **Dashboard:** http://localhost:5174

Use the API key printed by `npm run seed` in the dashboard login screen.

## API overview

```
POST   /v1/agents                         Create an agent with budget + policy rules
GET    /v1/agents                         List agents
POST   /v1/agents/:id/authorize           Request spend authorization
POST   /v1/authorizations/:id/approve     Human approval for pending requests
POST   /v1/authorizations/:id/deny        Deny a pending request
POST   /v1/authorizations/:id/capture     Finalize approved spend
GET    /v1/agents/:id/ledger              Immutable audit trail
GET    /v1/authorizations                 List authorizations (filter by status)
POST   /v1/webhook_endpoints              Register webhook URL
```

## Policy engine

Each authorization is evaluated against:

1. **Merchant allowlist** — block unknown merchants
2. **Single-transaction limit** — block oversized purchases
3. **Daily budget** — block when daily spend would exceed cap
4. **Approval threshold** — route large purchases to human review

## Demo flow

1. Create agent **Research Bot** with $250/day budget
2. Authorize $4.99 at `api.search.io` → auto-approved
3. Authorize $89 at `datasets.io` → pending (needs approval)
4. Authorize $200 at `unknown.shop` → blocked (not on allowlist)
5. Approve pending request in dashboard → capture → ledger updated
