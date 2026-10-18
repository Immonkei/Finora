# Finora — Personal Finance Tracker

Finora is a fast, simple, and mobile-friendly personal finance app. It helps you stay in control of your daily spending with real-time **Daily Allowance** calculations, dual currency support (USD & KHR), offline mode, and quick logging (keyboard, speech, or camera).

![Finora Logo](public/finora-logo.png)

---

## ✨ Features

- **Daily Spending Allowance:** Tells you exactly how much money you can safely spend today based on your monthly income and savings targets.
- **Dual Currency (USD & KHR):** Seamlessly handles US Dollars and Cambodian Riel with real-time conversion (`$1 = 4,100 KHR`).
- **Quick Logging:**
  - Standard clean keypad (< 5 seconds).
  - Voice logging (speak naturally: *"Spent five dollars on coffee"*).
  - AI Receipt OCR & Bakong KHQR slip scanning with Google Gemini.
- **Works Offline:** Progressive Web App (PWA) with automatic offline queue that syncs your data when you are back online.
- **Budgets & Rollovers:** Set category limits and roll over any unspent money into a savings buffer for next month.
- **Savings Goals:** Visual milestone rings, contribution presets, and celebration confetti when goals are reached.
- **Bills & Recurring Payments:** 30-day upcoming cash flow timeline and automated background charge logging.
- **Reports & Heatmaps:** 365-day spending heatmap calendar, financial health score, and downloadable monthly PDF statements.
- **Supabase Keep-Alive:** Built-in scheduler to ensure your free-tier Supabase database never goes to sleep from inactivity.

---

## ⚡ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Turbopack, React 19, TypeScript)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security)
- **Validation:** [Zod](https://zod.dev/) & [React Hook Form](https://react-hook-form.com/)
- **Charts:** [Recharts](https://recharts.org/)
- **AI Engine:** Google Gemini AI (for receipt scanning & weekly digests)
- **Testing:** [Vitest](https://vitest.dev/)

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Immonkei/Finora.git
cd Finora
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your own credentials in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Google Gemini for Receipt OCR and AI reports
GEMINI_API_KEY=your-gemini-key

# Optional: Secret token for recurring cron jobs
CRON_SECRET=your-cron-secret
```

### 3. Database Setup (Supabase)
Run the migration scripts in order using the Supabase SQL Editor:
1. `supabase/migrations/20261008000001_initial_schema.sql` (Tables, functions, and RLS policies)
2. `supabase/migrations/20261009000001_enable_realtime.sql` (Live real-time updates)
3. `supabase/migrations/20261010000001_recurring_cron.sql` (Recurring billing schedules)
4. `supabase/migrations/20261018000001_keep_alive_heartbeat.sql` (Database keep-alive ping)

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Tests & Linter
```bash
npm test
npm run lint
```

---

## 📁 Project Structure

```
├── docs/                   # Detailed project specifications and notes
├── public/                 # Static brand assets, icons, manifest, service worker
├── src/
│   ├── app/                # Next.js App Router pages and API routes
│   │   ├── (auth)/         # Login, register, and password reset
│   │   ├── (app)/          # Main dashboard, week, month, recurring, insights, goals, settings
│   │   └── api/            # Server API routes (cron, receipts, statements, AI)
│   ├── components/         # Reusable UI components and charts
│   ├── features/           # Feature modules (transactions, budgets, goals, recurring, reports)
│   ├── lib/                # Utility helpers (Supabase client/server, money math, offline queue)
│   └── types/              # Database types
└── supabase/
    └── migrations/         # PostgreSQL schema files
```

For full system architecture and requirement details, check [docs/project-specification.md](docs/project-specification.md).

---

## 🔒 Security & Privacy

- **Row Level Security (RLS):** Every database query is strictly filtered by user ID at the database layer. No user can ever view another user's data.
- **Server-Side Secrets:** Private keys like `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are only accessible on the server and are never sent to the browser.
- **Integer Math:** All money amounts are stored in smallest integer units (cents / riel) to eliminate floating-point rounding errors.
- **Soft Deletes:** Deleting a transaction preserves an audit trail and allows for immediate 10-second undos.

---

## 📄 License

This project is personal and open for portfolio review.
