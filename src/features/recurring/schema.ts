import { z } from "zod";
import { transactionTypeSchema } from "@/features/transactions/schema";

export const recurringRuleSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.enum(["USD", "KHR"]).default("USD"),
  account_id: z.string().uuid("Invalid account ID"),
  category_id: z.string().uuid().optional().nullable(),
  note: z.string().max(255).optional().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
});

export type RecurringRuleInput = z.infer<typeof recurringRuleSchema>;
