import { defineMessages } from "../define";

export const pwa = defineMessages({
  en: {
    connectionRestored: "Connection restored",
    connectionRestoredDescription: "Checking offline transaction queue...",
    stillOffline: "Still offline",
    stillOfflineDescription: "Transactions will upload automatically once internet connection is restored.",
    queueEmpty: "Queue is empty",
    queueEmptyDescription: "All transactions are fully synchronized with the cloud.",
    installOption: "Install option",
    installOptionDescription:
      "On iOS, tap the Share button and select 'Add to Home Screen'. On Android/Desktop, use browser menu 'Install App'.",
    installed: "Finora installed!",

    offlineBanner: "You are currently offline. Logged expenses queue locally and auto-sync on reconnect.",
    offlinePending: "({count} pending)",
    pendingBannerOne: "{count} offline transaction waiting for cloud upload",
    pendingBannerOther: "{count} offline transactions waiting for cloud upload",
    syncing: "Syncing...",
    syncNow: "Sync Now",

    installedStandalone: "App installed as native standalone PWA",
    active: "Active",
    installTitle: "Install Mobile App",
    installDescription: "Install Finora on your Home Screen for instant 5-second access and full offline support",
    installApp: "Install App",
    addToHomeScreen: "Add to Home Screen",

    queueTitle: "Offline Transaction Queue",
    queuedCount: "{count} Queued",
    allSynced: "All Synced",
    syncedToast: "Offline transactions synced!",
    syncedToastDescription: "Uploaded {count} queued transaction(s) to your cloud database.",
    queueOffline: "Currently working offline. Transactions will automatically flush once internet connects.",
    queuePending: "Pending offline transactions queued locally ready for Supabase sync.",
    queueClear: "Zero pending offline records. Cloud database is fully up to date.",
  },
  km: {
    connectionRestored: "បានភ្ជាប់អ៊ីនធឺណិតវិញ",
    connectionRestoredDescription: "កំពុងពិនិត្យប្រតិបត្តិការក្រៅបណ្ដាញដែលកំពុងរង់ចាំ...",
    stillOffline: "នៅតែគ្មានអ៊ីនធឺណិត",
    stillOfflineDescription: "ប្រតិបត្តិការនឹងបញ្ជូនដោយស្វ័យប្រវត្តិ នៅពេលភ្ជាប់អ៊ីនធឺណិតវិញ។",
    queueEmpty: "គ្មានប្រតិបត្តិការរង់ចាំ",
    queueEmptyDescription: "ប្រតិបត្តិការទាំងអស់បានធ្វើសមកាលកម្មជាមួយ Cloud រួចរាល់។",
    installOption: "របៀបដំឡើង",
    installOptionDescription:
      "នៅលើ iOS ចុចប៊ូតុង Share រួចជ្រើស 'Add to Home Screen'។ នៅលើ Android/កុំព្យូទ័រ ប្រើម៉ឺនុយកម្មវិធីរុករក 'Install App'។",
    installed: "បានដំឡើង Finora!",

    offlineBanner: "អ្នកកំពុងគ្មានអ៊ីនធឺណិត។ ការចំណាយដែលកត់ត្រានឹងរក្សាទុកក្នុងឧបករណ៍ ហើយធ្វើសមកាលកម្មពេលភ្ជាប់វិញ។",
    offlinePending: "({count} កំពុងរង់ចាំ)",
    pendingBannerOne: "ប្រតិបត្តិការក្រៅបណ្ដាញ {count} កំពុងរង់ចាំបញ្ជូនទៅ Cloud",
    pendingBannerOther: "ប្រតិបត្តិការក្រៅបណ្ដាញ {count} កំពុងរង់ចាំបញ្ជូនទៅ Cloud",
    syncing: "កំពុងធ្វើសមកាលកម្ម...",
    syncNow: "ធ្វើសមកាលកម្មឥឡូវ",

    installedStandalone: "បានដំឡើងកម្មវិធីជា PWA រួចរាល់",
    active: "សកម្ម",
    installTitle: "ដំឡើងកម្មវិធីទូរសព្ទ",
    installDescription: "ដំឡើង Finora លើអេក្រង់ដើម ដើម្បីបើកប្រើបានភ្លាមៗ និងប្រើបានពេលគ្មានអ៊ីនធឺណិត",
    installApp: "ដំឡើងកម្មវិធី",
    addToHomeScreen: "បន្ថែមទៅអេក្រង់ដើម",

    queueTitle: "ជួរប្រតិបត្តិការក្រៅបណ្ដាញ",
    queuedCount: "{count} កំពុងរង់ចាំ",
    allSynced: "បានសមកាលកម្មទាំងអស់",
    syncedToast: "បានសមកាលកម្មប្រតិបត្តិការក្រៅបណ្ដាញ!",
    syncedToastDescription: "បានបញ្ជូនប្រតិបត្តិការដែលរង់ចាំចំនួន {count} ទៅកាន់មូលដ្ឋានទិន្នន័យពពក។",
    queueOffline: "កំពុងប្រើក្រៅបណ្ដាញ។ ប្រតិបត្តិការនឹងបញ្ជូនដោយស្វ័យប្រវត្តិ នៅពេលភ្ជាប់អ៊ីនធឺណិត។",
    queuePending: "មានប្រតិបត្តិការក្រៅបណ្ដាញរក្សាទុកក្នុងឧបករណ៍ រង់ចាំធ្វើសមកាលកម្មជាមួយ Supabase។",
    queueClear: "គ្មានកំណត់ត្រាក្រៅបណ្ដាញរង់ចាំទេ។ ទិន្នន័យ Cloud ទាន់សម័យទាំងស្រុង។",
  },
});
