import { defineMessages } from "../define";

export const notifications = defineMessages({
  en: {
    bellLabel: "Notifications",
    bellLabelUnread: "Notifications ({count} unread)",
    title: "Budget Alerts",
    newCount: "{count} new",
    markAllRead: "Mark all read",
    empty: "No notifications right now.",
    sendTestToSupabase: "Send test alert to Supabase",
    dismiss: "Dismiss",
    realtimeLive: "Supabase Realtime Live",
    triggerTest: "Trigger Test Alert",

    titleLimit: "Budget Limit Reached (100%)",
    titleWarning: "Budget Warning (80%)",
    titleReminder: "Logging Reminder",

    testMessage: "Live Realtime Test: Budget monitoring active. Current time {time}.",
    testSent: "Test alert sent to Supabase!",
    testFailed: "Failed to trigger alert",
  },
  km: {
    bellLabel: "ការជូនដំណឹង",
    bellLabelUnread: "ការជូនដំណឹង ({count} មិនទាន់អាន)",
    title: "ការជូនដំណឹងថវិកា",
    newCount: "{count} ថ្មី",
    markAllRead: "សម្គាល់ថាបានអានទាំងអស់",
    empty: "មិនមានការជូនដំណឹងទេ។",
    sendTestToSupabase: "ផ្ញើការជូនដំណឹងសាកល្បងទៅ Supabase",
    dismiss: "បិទចោល",
    realtimeLive: "Supabase Realtime ផ្ទាល់",
    triggerTest: "ផ្ញើការជូនដំណឹងសាកល្បង",

    titleLimit: "ដល់ដែនកំណត់ថវិកា (100%)",
    titleWarning: "ព្រមានថវិកា (80%)",
    titleReminder: "រំលឹកកត់ត្រាចំណាយ",

    testMessage: "សាកល្បងផ្ទាល់៖ ការតាមដានថវិកាកំពុងដំណើរការ។ ម៉ោងបច្ចុប្បន្ន {time}។",
    testSent: "បានផ្ញើការជូនដំណឹងសាកល្បងទៅ Supabase!",
    testFailed: "មិនអាចផ្ញើការជូនដំណឹងបានទេ",
  },
});
