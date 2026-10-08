# Finora — Personal Finance Tracker

Finora is a fast, mobile-friendly personal finance tracking web application built to help users take control of their spending through live **Daily Allowance** calculations, quick logging (< 5s), multi-currency support (USD & KHR), and privacy backed by PostgreSQL Row Level Security (RLS).

![Finora Logo](public/finora-logo.png)

---

## ⚡ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Turbopack, TypeScript)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Row Level Security)
- **Validation:** [Zod](https://zod.dev/) & [React Hook Form](https://react-hook-form.com/)
- **Charts:** [Recharts](https://recharts.org/)
- **Dates:** [date-fns](https://date-fns.org/)
- **Testing:** [Vitest](https://vitest.dev/)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your Supabase project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Database Setup (Supabase)
Run the initial migration located at:
`supabase/migrations/20261008000001_initial_schema.sql`
This establishes all core tables (`profiles`, `accounts`, `categories`, `transactions`, `budgets`, `savings_goals`, `recurring_rules`, `notifications`), triggers, RLS policies, and RPC report functions.

### 5. Running Tests
```bash
npm test
```

---

## 📁 Project Structure

```
├── public/                 # Static assets & brand logo
├── src/
│   ├── app/
│   │   ├── (auth)/         # Auth routes (login, register, reset-password)
│   │   ├── (app)/          # App shell routes (today, week, month, transactions, goals, settings)
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Landing page
│   ├── components/
│   │   ├── ui/             # Reusable UI primitives (Button, Card, Input, Badge)
│   │   └── app-nav.tsx     # Mobile bottom bar & desktop sidebar navigation
│   ├── features/
│   │   ├── transactions/   # Zod schema, types, actions & components
│   │   ├── budgets/        # Budget management schema
│   │   ├── goals/          # Savings goals schema
│   │   └── recurring/      # Recurring rules schema
│   ├── lib/
│   │   ├── supabase/       # Supabase client, server, and middleware helpers
│   │   ├── money.ts        # Minor unit conversions, formatting, and allowance formulas
│   │   ├── dates.ts        # Timezone-aware date boundaries and formatting
│   │   └── utils.ts        # Tailwind class merger
│   ├── proxy.ts            # Next.js route proxy / session middleware
│   └── types/
│       └── database.ts     # Supabase database types
└── supabase/
    └── migrations/         # PostgreSQL schema migrations and RLS policies
```

---

## 🔒 Security & Architecture Decisions
- **Money stored as integers (minor units):** Prevents floating-point rounding errors across USD and KHR.
- **Row Level Security (RLS) on every table:** User data isolation is enforced at the database layer.
- **Server Actions for writes:** Validates input with Zod prior to database persistence.
- **Soft deletes:** Preserves transaction records for undo actions without skewing historical reports.
