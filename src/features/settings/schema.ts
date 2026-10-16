import { z } from "zod";

export const updateSettingsSchema = z.object({
  main_currency: z.enum(["USD", "KHR"]),
  timezone: z.string().min(1, "Timezone is required"),
  week_starts_on: z.union([z.literal(0), z.literal(1)]),
  reminder_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Invalid reminder time format (HH:mm)")
    .nullable()
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
