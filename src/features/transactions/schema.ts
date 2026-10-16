import { z } from "zod";

export const transactionTypeSchema = z.enum(["expense", "income", "transfer"]);

export const createTransactionSchema = z
  .object({
    type: transactionTypeSchema,
    amount: z.number().positive("Amount must be greater than 0"),
    currency: z.enum(["USD", "KHR"]).default("USD"),
    account_id: z.string().min(1, "Account ID is required"),
    to_account_id: z.string().min(1, "Invalid destination account ID").optional().nullable(),
    category_id: z.string().min(1, "Invalid category ID").optional().nullable(),
    note: z.string().max(255).optional().nullable(),
    receipt_url: z.string().optional().nullable(),
    occurred_at: z.string().datetime().or(z.date()).default(() => new Date().toISOString()),
  })
  .refine(
    (data) => {
      if (data.type === "transfer") {
        return !!data.to_account_id && data.to_account_id !== data.account_id;
      }
      return true;
    },
    {
      message: "Transfers require a distinct destination account",
      path: ["to_account_id"],
    }
  );

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const transactionFilterSchema = z.object({
  search: z.string().optional(),
  type: transactionTypeSchema.optional(),
  account_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(30),
});

export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;

export const updateTransactionSchema = z.object({
  id: z.string().min(1, "Transaction ID is required"),
  type: transactionTypeSchema.optional(),
  amount: z.number().positive("Amount must be greater than 0").optional(),
  currency: z.enum(["USD", "KHR"]).optional(),
  category_id: z.string().optional().nullable(),
  note: z.string().max(255).optional().nullable(),
  receipt_url: z.string().optional().nullable(),
  occurred_at: z.string().datetime().or(z.date()).optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

