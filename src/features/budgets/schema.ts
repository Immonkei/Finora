import { z } from "zod";

export const setBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "Month must be formatted as YYYY-MM-01"),
  total_limit: z.number().positive("Total monthly limit must be positive"),
});

export const setCategoryBudgetSchema = z.object({
  category_id: z.string().uuid("Invalid category ID"),
  monthly_budget: z.number().positive("Category budget must be positive").nullable(),
  rollover: z.boolean().default(false),
});

export type SetBudgetInput = z.infer<typeof setBudgetSchema>;
export type SetCategoryBudgetInput = z.infer<typeof setCategoryBudgetSchema>;
