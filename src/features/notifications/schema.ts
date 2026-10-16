import { z } from "zod";

export const createNotificationSchema = z.object({
  kind: z.enum(["warning_80", "limit_100", "reminder"]),
  message: z.string().min(1, "Notification message is required").max(500),
});

export const notificationIdSchema = z.object({
  id: z.string().uuid("Invalid notification ID"),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type NotificationIdInput = z.infer<typeof notificationIdSchema>;
