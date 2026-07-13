import { z } from 'zod';

export const createAgentSchema = z.object({
  name: z.string().min(1),
  daily_budget_cents: z.number().int().positive(),
  max_single_tx_cents: z.number().int().positive().optional(),
  approval_threshold_cents: z.number().int().nonnegative().optional(),
  merchant_allowlist: z.array(z.string().min(1)).default([]),
});

export const authorizeSpendSchema = z.object({
  amount_cents: z.number().int().positive(),
  merchant: z.string().min(1),
  reason: z.string().min(1),
  currency: z.string().default('usd'),
  metadata: z.record(z.unknown()).optional(),
});

export const createWebhookEndpointSchema = z.object({
  url: z.string().url(),
});
