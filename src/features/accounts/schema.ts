import { z } from "zod";

export const ACCOUNT_KINDS = ["cash", "bank", "ewallet", "other"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, "Account name is required").max(60),
  kind: z.enum(ACCOUNT_KINDS).default("cash"),
  currency: z.enum(["USD", "KHR"]).default("USD"),
  /** Opening balance as a decimal amount in the account currency (may be negative, e.g. credit) */
  opening_balance: z.number().finite().default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
});

export const updateAccountSchema = accountInputSchema.extend({
  id: z.string().uuid("Invalid account ID"),
});

export const accountIdSchema = z.object({
  id: z.string().uuid("Invalid account ID"),
});

export type AccountInput = z.input<typeof accountInputSchema>;
export type UpdateAccountInput = z.input<typeof updateAccountSchema>;
