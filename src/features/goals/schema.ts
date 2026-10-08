import { z } from "zod";

export const createSavingsGoalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(100),
  target_amount: z.number().positive("Target amount must be greater than 0"),
  saved_amount: z.number().min(0).default(0),
  deadline: z.string().optional().nullable(),
});

export const contributeGoalSchema = z.object({
  goal_id: z.string().uuid("Invalid goal ID"),
  amount: z.number().positive("Contribution amount must be greater than 0"),
});

export type CreateSavingsGoalInput = z.infer<typeof createSavingsGoalSchema>;
export type ContributeGoalInput = z.infer<typeof contributeGoalSchema>;
