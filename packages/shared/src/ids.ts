const PREFIXES = {
  org: 'org',
  agent: 'agt',
  authorization: 'authz',
  ledger: 'led',
  webhook: 'we',
  event: 'evt',
} as const;

type Prefix = keyof typeof PREFIXES;

export function generateId(prefix: Prefix): string {
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return `${PREFIXES[prefix]}_${random}`;
}
