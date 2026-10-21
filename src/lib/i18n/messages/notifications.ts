import { defineMessages } from "../define";

export const notifications = defineMessages({
  en: {
    bellLabel: "Notifications",
    bellLabelUnread: "Notifications ({count} unread)",
    title: "Budget Alerts",
    newCount: "{count} new",
    markAllRead: "Mark all read",
    empty: "No notifications right now.",
    dismiss: "Dismiss",
    realtimeLive: "Supabase Realtime Live",

    titleLimit: "Budget Limit Reached (100%)",
    titleWarning: "Budget Warning (80%)",
    titleReminder: "Logging Reminder",
  },
  km: {
    bellLabel: "ការជូនដំណឹង",
    bellLabelUnread: "ការជូនដំណឹង ({count} មិនទាន់អាន)",
    title: "ការជូនដំណឹងថវិកា",
    newCount: "{count} ថ្មី",
    markAllRead: "សម្គាល់ថាបានអានទាំងអស់",
    empty: "មិនមានការជូនដំណឹងទេ។",
    dismiss: "បិទចោល",
    realtimeLive: "Supabase Realtime ផ្ទាល់",

    titleLimit: "ដល់ដែនកំណត់ថវិកា (100%)",
    titleWarning: "ព្រមានថវិកា (80%)",
    titleReminder: "រំលឹកកត់ត្រាចំណាយ",
  },
});
