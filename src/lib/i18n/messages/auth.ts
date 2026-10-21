import { defineMessages } from "../define";

export const auth = defineMessages({
  en: {
    // Shared form bits
    email: "Email",
    emailAddress: "Email address",
    emailPlaceholder: "you@example.com",
    password: "Password",
    orContinueWith: "Or continue with",
    continueWithGoogle: "Continue with Google",

    // Login
    loginTagline: "Sign in to manage your budget and daily allowance",
    signInTitle: "Sign in",
    signInDescription: "Enter your email and password to access your account",
    forgotPassword: "Forgot password?",
    signIn: "Sign in",
    signingIn: "Signing in...",
    noAccount: "Don't have an account?",
    createOne: "Create one",
    signInFailed: "Sign in failed",
    welcomeBack: "Welcome back!",

    // Register
    registerTagline: "Start taking control of your daily spending",
    signUpTitle: "Sign up for Finora",
    signUpDescription: "We automatically set up your default Cash account & categories",
    passwordMin: "Password (min 8 chars)",
    privacyNote: "Your financial data is private and secured with Row Level Security (RLS).",
    createAccount: "Create Account",
    creatingAccount: "Creating account...",
    haveAccount: "Already have an account?",
    passwordTooShort: "Password too short",
    passwordTooShortDesc: "Password must be at least 8 characters.",
    signUpFailed: "Sign up failed",
    accountCreated: "Account created successfully!",
    checkEmailToConfirm: "Registration initiated!",
    checkEmailToConfirmDesc: "Please check your email inbox to confirm your account.",

    // Google
    googleSignInFailed: "Google sign in failed",
    googleInitFailed: "Failed to initialize Google login",

    // Reset password
    resetTitle: "Reset Password",
    resetTagline: "We will email you a secure link to reset your password",
    checkInbox: "Check your inbox",
    resetSentTo: "We sent a password reset link to",
    backToSignIn: "Back to sign in",
    sendResetLink: "Send Reset Link",
    sending: "Sending...",
    resetFailed: "Failed to send reset link",
    resetSent: "Password reset email sent!",

    // Generic errors
    unexpectedError: "An unexpected error occurred",
    tryAgain: "Please try again",

    // Known Supabase auth errors
    errInvalidCredentials: "Incorrect email or password.",
    errEmailNotConfirmed: "Please confirm your email before signing in.",
    errUserExists: "An account with this email already exists.",
    errWeakPassword: "Password is too weak. Please choose a stronger one.",
    errInvalidEmail: "Please enter a valid email address.",
    errRateLimit: "Too many attempts. Please wait a moment and try again.",
    errNetwork: "Network error. Check your connection and try again.",
  },
  km: {
    email: "អ៊ីមែល",
    emailAddress: "អាសយដ្ឋានអ៊ីមែល",
    emailPlaceholder: "you@example.com",
    password: "ពាក្យសម្ងាត់",
    orContinueWith: "ឬបន្តជាមួយ",
    continueWithGoogle: "បន្តជាមួយ Google",

    loginTagline: "ចូលគណនី ដើម្បីគ្រប់គ្រងថវិកា និងប្រាក់ចាយប្រចាំថ្ងៃ",
    signInTitle: "ចូលគណនី",
    signInDescription: "បញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់ ដើម្បីចូលគណនីរបស់អ្នក",
    forgotPassword: "ភ្លេចពាក្យសម្ងាត់?",
    signIn: "ចូល",
    signingIn: "កំពុងចូល...",
    noAccount: "មិនទាន់មានគណនី?",
    createOne: "បង្កើតគណនី",
    signInFailed: "ចូលគណនីមិនបានសម្រេច",
    welcomeBack: "សូមស្វាគមន៍ការត្រឡប់មកវិញ!",

    registerTagline: "ចាប់ផ្ដើមគ្រប់គ្រងការចំណាយប្រចាំថ្ងៃរបស់អ្នក",
    signUpTitle: "ចុះឈ្មោះប្រើ Finora",
    signUpDescription: "យើងនឹងរៀបចំគណនីសាច់ប្រាក់ និងប្រភេទចំណាយលំនាំដើមជូនអ្នកដោយស្វ័យប្រវត្តិ",
    passwordMin: "ពាក្យសម្ងាត់ (យ៉ាងតិច 8 តួ)",
    privacyNote: "ទិន្នន័យហិរញ្ញវត្ថុរបស់អ្នកជាឯកជន និងត្រូវបានការពារដោយ Row Level Security (RLS)។",
    createAccount: "បង្កើតគណនី",
    creatingAccount: "កំពុងបង្កើតគណនី...",
    haveAccount: "មានគណនីរួចហើយ?",
    passwordTooShort: "ពាក្យសម្ងាត់ខ្លីពេក",
    passwordTooShortDesc: "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួ។",
    signUpFailed: "ចុះឈ្មោះមិនបានសម្រេច",
    accountCreated: "បង្កើតគណនីបានជោគជ័យ!",
    checkEmailToConfirm: "ការចុះឈ្មោះបានចាប់ផ្ដើម!",
    checkEmailToConfirmDesc: "សូមពិនិត្យប្រអប់អ៊ីមែលរបស់អ្នក ដើម្បីបញ្ជាក់គណនី។",

    googleSignInFailed: "ចូលតាម Google មិនបានសម្រេច",
    googleInitFailed: "មិនអាចចាប់ផ្ដើមការចូលតាម Google បានទេ",

    resetTitle: "កំណត់ពាក្យសម្ងាត់ឡើងវិញ",
    resetTagline: "យើងនឹងផ្ញើតំណសុវត្ថិភាពទៅអ៊ីមែលរបស់អ្នក ដើម្បីកំណត់ពាក្យសម្ងាត់ឡើងវិញ",
    checkInbox: "សូមពិនិត្យប្រអប់សំបុត្ររបស់អ្នក",
    resetSentTo: "យើងបានផ្ញើតំណកំណត់ពាក្យសម្ងាត់ឡើងវិញទៅ",
    backToSignIn: "ត្រឡប់ទៅទំព័រចូល",
    sendResetLink: "ផ្ញើតំណកំណត់ឡើងវិញ",
    sending: "កំពុងផ្ញើ...",
    resetFailed: "មិនអាចផ្ញើតំណកំណត់ឡើងវិញបានទេ",
    resetSent: "បានផ្ញើអ៊ីមែលកំណត់ពាក្យសម្ងាត់ឡើងវិញ!",

    unexpectedError: "មានបញ្ហាដែលមិននឹកស្មានដល់",
    tryAgain: "សូមព្យាយាមម្ដងទៀត",

    errInvalidCredentials: "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។",
    errEmailNotConfirmed: "សូមបញ្ជាក់អ៊ីមែលរបស់អ្នក មុនពេលចូលគណនី។",
    errUserExists: "អ៊ីមែលនេះមានគណនីរួចហើយ។",
    errWeakPassword: "ពាក្យសម្ងាត់ខ្សោយពេក។ សូមជ្រើសរើសពាក្យសម្ងាត់ដែលរឹងមាំជាងនេះ។",
    errInvalidEmail: "សូមបញ្ចូលអាសយដ្ឋានអ៊ីមែលឱ្យបានត្រឹមត្រូវ។",
    errRateLimit: "ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំបន្តិច រួចព្យាយាមម្ដងទៀត។",
    errNetwork: "បញ្ហាបណ្ដាញ។ សូមពិនិត្យការតភ្ជាប់ រួចព្យាយាមម្ដងទៀត។",
  },
});
