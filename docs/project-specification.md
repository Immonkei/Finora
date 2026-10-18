# Personal Finance Tracker — Project Specification

Version 1.0 · Stack: Next.js + Supabase · Author: Immonkei

## 1. Overview

### 1.1 Problem

People often overspend because they do not know where their money goes. Logging expenses is slow, summaries are hard to read, and budgets are checked only after the money is gone.

### 1.2 Solution

A fast, mobile-friendly web app (PWA) where the user logs every expense in a few seconds, sees daily, weekly and monthly summaries, and sets spending goals. The app calculates a **daily allowance** in real time, so the user sees the problem while it happens, not at the end of the month.

### 1.3 Goals

- Add an expense in under 5 seconds.
- Show clear day, week and month summaries.
- Let the user set budgets and savings goals, and warn before the limit is passed.
- Be secure: one user can never see another user's data.
- Be professional: typed, tested, documented, and deployable.

### 1.4 Non-goals (version 1)

- No direct bank account connection.
- No investment or stock tracking.
- No native mobile app (PWA only).
- No multi-user shared household budgets (planned for later).

### 1.5 Target users

- **Primary:** students and young professionals who want to control spending.
- **Secondary:** anyone who uses both USD and KHR and wants one clear view.

### 1.6 Success metrics

- Median time to log an expense is under 5 seconds.
- The user logs expenses on at least 5 of 7 days per week.
- Monthly overspend percentage goes down over the first 3 months.
- Page load (LCP) under 2.5 s on a mid-range phone.

## 2. Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router), TypeScript |
| Styling / UI | Tailwind CSS, shadcn/ui |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email + Google) |
| Security | Row Level Security (RLS) |
| Scheduled jobs | pg\_cron + Supabase Edge Functions |
| Realtime | Supabase Realtime |
| File storage | Supabase Storage (receipts, later) |
| Forms / validation | React Hook Form + Zod |
| Data fetching | Server Components, Server Actions, TanStack Query |
| Charts | Recharts |
| Dates | date-fns + date-fns-tz |
| Testing | Vitest, Playwright |
| CI/CD | GitHub Actions, Vercel |
| Monitoring | Sentry, Vercel Analytics |
| AI (later) | Claude API via Edge Function |

## 3. Features

### 3.1 Phase 1 — Core (MVP)

1. Authentication (register, login, logout, password reset).
2. Accounts (cash, bank, e-wallet).
3. Categories (default set + custom).
4. Quick-add expense and income.
5. Today screen with daily total and list.
6. Week and Month summaries with charts.
7. Monthly budget per category and total.
8. Daily allowance.

### 3.2 Phase 2 — Smart

9. Recurring transactions (rent, subscriptions).
10. Budget alerts at 80% and 100%.
11. Savings goals with progress.
12. Transfers between accounts.
13. Edit, delete (soft) and undo.
14. Search and filters.
15. CSV export.

### 3.3 Phase 3 — Insights

16. Spending leak detection (small repeated expenses).
17. Forecast of end-of-month spending.
18. Compare periods (this week vs last, this month vs last).
19. Multi-currency (USD and KHR) with stored exchange rates.
20. Streaks (days under budget, no-spend days).

### 3.4 Phase 4 — Advanced

21. Natural language entry ("coffee 2.5").
22. Receipt photo scan.
23. AI weekly insight report.
24. PWA offline mode with sync.
25. Push or email reminders.
26. Shared budgets (family, couple).

## 4. Functional Requirements

### 4.1 Authentication

- **FR-A1** User can register with email and password or with Google.
- **FR-A2** User can reset password by email.
- **FR-A3** All app pages require login; unauthenticated users are redirected to login.
- **FR-A4** On first login, default categories and one default account ("Cash") are created.

### 4.2 Transactions

- **FR-T1** User can create an expense, income, or transfer.
- **FR-T2** Required fields: amount, type, account, date (default now). Optional: category, note.
- **FR-T3** Amount must be greater than 0 and is stored in minor units (cents or riel), never as a float.
- **FR-T4** The amount field is focused automatically when the add form opens.
- **FR-T5** The category is preselected with the last used category.
- **FR-T6** User can edit a transaction and delete it. Delete is soft (`deleted_at`) and can be undone for 10 seconds.
- **FR-T7** A transfer moves money between two accounts and is not counted as spending.
- **FR-T8** The list can be filtered by date range, category, account, type, and searched by note.

### 4.3 Summaries

- **FR-S1** Today: total spent today, list of today's transactions, daily allowance.
- **FR-S2** Week: total, spending per day (bar chart), top 3 categories, change vs last week.
- **FR-S3** Month: total, spending per category (chart), budget progress, change vs last month.
- **FR-S4** All summaries use the user's timezone to decide which day, week and month a transaction belongs to.
- **FR-S5** Week starts on Monday (configurable in settings).

### 4.4 Budgets and goals

- **FR-B1** User sets a total monthly limit and optional limits per category.
- **FR-B2** Progress colors: green below 80%, yellow from 80% to 100%, red above 100%.
- **FR-B3** Daily allowance = (monthly limit − spent this month) ÷ days left in the month (minimum 0).
- **FR-B4** User can create savings goals with a name, target amount, and deadline. The app shows progress and the amount needed per week.
- **FR-B5** Optional rollover: unspent budget moves to next month (setting per category).

### 4.5 Recurring

- **FR-R1** User can create a rule: amount, category, account, frequency (daily, weekly, monthly), start date, optional end date.
- **FR-R2** A daily job creates due transactions from the rules.
- **FR-R3** The job is idempotent: a unique key on `(recurring_id, occurred_at)` prevents duplicates when a job runs twice.

### 4.6 Notifications

- **FR-N1** Create an in-app notification when a budget reaches 80% and 100%.
- **FR-N2** Optional daily reminder ("Did you log everything today?") at a time chosen by the user.

### 4.7 Settings and export

- **FR-X1** User can set main currency, timezone, week start day, and reminder time.
- **FR-X2** User can export transactions to CSV for a chosen date range.
- **FR-X3** User can delete their account and all data.

## 5. User Stories

- As a user, I want to add an expense in a few seconds, so I do not stop logging.
- As a user, I want to see how much I can still spend today, so I can control my spending.
- As a user, I want a weekly summary, so I understand my habits.
- As a user, I want a warning before I pass my budget, so I can stop in time.
- As a user, I want recurring expenses added automatically, so I do not forget them.
- As a user, I want to set a savings goal, so I know how much to save each week.
- As a user, I want to use both USD and riel, so my totals are correct.
- As a user, I want my data private, so nobody else can see it.

## 6. Screens

| Screen | Content |
| --- | --- |
| Login / Register | Email, password, Google button |
| Today (home) | Big "Add" button, today's total, daily allowance bar, today's list |
| Add transaction (sheet) | Amount (auto-focus), category buttons, note, account, date, save |
| Week | Total, daily bar chart, top categories, vs last week |
| Month | Total, category chart, budget progress bars, vs last month |
| Transactions | Full list with filters and search, edit and delete |
| Goals | Monthly budgets, savings goals |
| Recurring | List and create rules |
| Settings | Currency, timezone, reminders, export, delete account |

**Navigation:** bottom tab bar on mobile (Today, Week, Month, Goals, More), sidebar on desktop.

**UX rules:** mobile first, one-hand use, large tap targets, dark mode, loading skeletons, optimistic updates, clear empty states.

## 7. Architecture

### 7.1 Overview

The browser talks to Next.js (hosted on Vercel). Next.js Server Components and Server Actions read and write to Supabase using the logged-in user's session. Security is enforced in the database with RLS. Scheduled work runs inside Supabase (pg\_cron and Edge Functions).

### 7.2 Folder structure

```
finance-tracker/
├── src/
│   ├── app/
│   │   ├── (auth)/login, register, reset-password
│   │   └── (app)/today, week, month, transactions, goals, recurring, settings
│   ├── features/
│   │   ├── transactions/ { actions.ts, queries.ts, schema.ts, components/ }
│   │   ├── budgets/
│   │   ├── goals/
│   │   ├── recurring/
│   │   └── reports/
│   ├── components/ui/        # shadcn/ui
│   ├── lib/
│   │   ├── supabase/ { client.ts, server.ts, middleware.ts }
│   │   ├── money.ts           # format and convert minor units
│   │   └── dates.ts           # timezone helpers
│   └── types/database.ts      # generated by Supabase CLI
├── supabase/
│   ├── migrations/
│   ├── functions/
│   ├── tests/                 # pgTAP tests for RLS
│   └── seed.sql
├── e2e/                       # Playwright tests
└── .github/workflows/ci.yml
```

### 7.3 Key design decisions

- **Money as integers.** All amounts are `bigint` in minor units. Display formatting happens only in the UI.
- **RLS everywhere.** Every table has `user_id` and a policy `user_id = auth.uid()`.
- **Math in SQL.** Reports are SQL functions called with `supabase.rpc`, using `security invoker` so RLS still applies.
- **Server Actions for writes.** Each action validates input with Zod, then writes through Supabase.
- **Soft delete.** Rows are never removed immediately; reports ignore rows with `deleted_at`.
- **UTC storage, local grouping.** Timestamps are stored in UTC; day, week and month grouping uses the user's timezone.
- **Exchange rate stored per transaction**, so old reports do not change when rates change.
- **Idempotent jobs**, safe to retry.

## 8. Data Model

### 8.1 Tables

| Table | Purpose |
| --- | --- |
| profiles | User settings: main currency, timezone, week start, reminder time |
| accounts | Cash, bank, e-wallet; currency per account |
| categories | Name, color, icon, monthly budget, rollover flag |
| transactions | Expense, income, transfer records |
| budgets | Total monthly limit per month |
| savings\_goals | Name, target, deadline, saved amount |
| recurring\_rules | Repeating transaction templates |
| notifications | In-app alerts, read flag |
| exchange\_rates | Rate per currency pair per date |

### 8.2 Core SQL

```sql
create type tx_type as enum ('expense', 'income', 'transfer');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  main_currency text not null default 'USD',
  timezone text not null default 'Asia/Phnom_Penh',
  week_starts_on smallint not null default 1,
  reminder_time time
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  color text,
  icon text,
  monthly_budget bigint,
  rollover boolean not null default false
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  type tx_type not null,
  amount bigint not null check (amount > 0),
  currency text not null,
  exchange_rate numeric(18,6) not null default 1,
  base_amount bigint not null,
  account_id uuid not null references accounts,
  to_account_id uuid references accounts,
  category_id uuid references categories,
  note text,
  occurred_at timestamptz not null default now(),
  recurring_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint transfer_needs_target check (
    (type = 'transfer') = (to_account_id is not null)
  ),
  unique (recurring_id, occurred_at)
);

create index on transactions (user_id, occurred_at desc);
create index on transactions (user_id, category_id, occurred_at);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  month date not null,               -- first day of month
  total_limit bigint not null,
  unique (user_id, month)
);

create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  target_amount bigint not null check (target_amount > 0),
  saved_amount bigint not null default 0,
  deadline date,
  created_at timestamptz not null default now()
);

create table recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  type tx_type not null,
  amount bigint not null check (amount > 0),
  currency text not null,
  account_id uuid not null references accounts,
  category_id uuid references categories,
  note text,
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  start_date date not null,
  end_date date,
  next_run date not null,
  active boolean not null default true
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  kind text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 8.3 Row Level Security

For every table above, enable RLS and add one policy:

```sql
alter table transactions enable row level security;
create policy "own rows" on transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

(`profiles` uses `id = auth.uid()`. `exchange_rates` is readable by all signed-in users and written only by the server.)

### 8.4 Report functions (RPC)

```sql
create function spending_by_category(p_from timestamptz, p_to timestamptz)
returns table (category_id uuid, total bigint)
language sql security invoker as $$
  select category_id, sum(base_amount)
  from transactions
  where type = 'expense' and deleted_at is null
    and occurred_at >= p_from and occurred_at < p_to
  group by category_id;
$$;

create function spending_by_day(p_from timestamptz, p_to timestamptz, p_tz text)
returns table (day date, total bigint)
language sql security invoker as $$
  select (occurred_at at time zone p_tz)::date, sum(base_amount)
  from transactions
  where type = 'expense' and deleted_at is null
    and occurred_at >= p_from and occurred_at < p_to
  group by 1 order by 1;
$$;
```

Other functions: `month_summary`, `daily_allowance`, `budget_progress`, `month_forecast`, `top_small_expenses`.

## 9. Business Logic

### 9.1 Daily allowance

```
remaining_budget = total_limit - spent_this_month
days_left        = days in month - today + 1
daily_allowance  = max(0, remaining_budget / days_left)
```

Shown on the Today screen and updated after every transaction.

### 9.2 Forecast

```
average_per_day   = spent_so_far / days_passed
forecast_month    = spent_so_far + average_per_day * days_left
overspend_risk    = forecast_month > total_limit
```

### 9.3 Spending leaks

Group expenses under a small threshold (for example below $5) by category or note. Show the monthly total of the top repeated ones, such as coffee or snacks.

### 9.4 Multi-currency

On save, look up the exchange rate for the transaction date, store it, and compute `base_amount`. Reports sum `base_amount` only.

### 9.5 Recurring job

A daily `pg_cron` job selects active rules where `next_run <= today`, inserts transactions with `on conflict do nothing`, then moves `next_run` forward.

## 10. Server Actions and Queries

| Name | Type | Purpose |
| --- | --- | --- |
| createTransaction | action | Validate with Zod, insert, revalidate Today |
| updateTransaction | action | Edit fields |
| deleteTransaction / restoreTransaction | action | Soft delete and undo |
| setBudget / setCategoryBudget | action | Save limits |
| createGoal / contributeToGoal | action | Savings goals |
| createRecurringRule / toggleRule | action | Manage rules |
| getToday | query | Total, list, allowance |
| getWeek / getMonth | query | RPC summaries |
| listTransactions | query | Filters, search, pagination |
| exportCsv | route handler | CSV download |

All inputs are validated with Zod schemas kept next to each feature.

## 11. Security and Privacy

- RLS on every table, tested with pgTAP (user A cannot read or write user B's rows).
- Service role key is used only in Edge Functions, never in the browser.
- Environment variables stored in Vercel and Supabase secrets, never committed.
- HTTPS only, secure cookies, CSRF protection from Server Actions.
- Rate limiting on auth and export endpoints.
- Content Security Policy headers.
- Account deletion removes all user data (cascade).
- Financial data is private by default; no third-party analytics on transaction content.
- If AI features are added, send only the minimum data needed and tell the user.

## 12. Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Performance | LCP < 2.5 s; summary queries < 300 ms for 50,000 transactions |
| Availability | Uses managed services (Vercel, Supabase); target 99.5% |
| Accessibility | WCAG 2.1 AA: labels, contrast, keyboard use |
| Responsiveness | Works from 360 px wide phones to desktop |
| Compatibility | Latest Chrome, Safari, Firefox, Edge |
| Maintainability | TypeScript strict mode, ESLint, Prettier, feature-based folders |
| Offline (Phase 4) | Queue new transactions offline and sync later |
| Localization | English first; Khmer language support planned |

## 13. Testing Strategy

- **Unit (Vitest):** money helpers, allowance, forecast, date and timezone logic.
- **Database (pgTAP):** RLS policies, constraints, report functions.
- **Integration:** Server Actions against a local Supabase instance.
- **End-to-end (Playwright):** register, add expense, view Today, set budget, see alert, export CSV.
- **Coverage target:** 80% on business logic folders.
- Every pull request must pass lint, type check and tests.

## 14. DevOps

- **Environments:** local (Supabase CLI + Docker), staging, production.
- **Migrations:** only through `supabase/migrations`, reviewed in pull requests.
- **CI (GitHub Actions):** install, lint, typecheck, unit tests, database tests, build.
- **CD:** Vercel deploys previews per pull request and production on merge to `main`; `supabase db push` runs migrations to production.
- **Monitoring:** Sentry for errors, Vercel Analytics for performance, Supabase logs for database.
- **Backups:** Supabase daily backups; CSV export gives the user their own backup.
- **Git workflow:** feature branches, small pull requests, conventional commits.

## 15. Roadmap

| Phase | Scope | Estimate |
| --- | --- | --- |
| 0 — Setup | Repo, Supabase project, Next.js, auth, CI | 2–3 days |
| 1 — MVP | Accounts, categories, quick-add, Today, Week, Month, budgets, allowance | 2 weeks |
| 2 — Smart | Recurring, alerts, savings goals, transfers, search, export | 2 weeks |
| 3 — Insights | Leaks, forecast, comparisons, multi-currency, streaks | 2 weeks |
| 4 — Advanced | AI entry, receipt scan, offline PWA, reminders, shared budgets | 3–4 weeks |

Estimates assume part-time work by one developer and can change.

## 16. Risks and Mitigation

| Risk | Mitigation |
| --- | --- |
| User stops logging because it is slow | Optimize quick-add first; test it with real daily use |
| Wrong totals from float or timezone bugs | Integer money, UTC storage, unit tests for edge cases (midnight, month end) |
| Data leak between users | RLS on all tables plus automated RLS tests |
| Too many features, project never finishes | Ship Phase 1 first and use it daily before starting Phase 2 |
| Duplicate recurring transactions | Unique key and `on conflict do nothing` |
| Exchange rate source fails | Cache rates, allow manual rate entry |
| Supabase free tier limits | Monitor usage; upgrade plan only when needed |

## 17. Definition of Done (per feature)

- Meets its functional requirements.
- Types are strict with no `any`.
- Unit and e2e tests added and passing.
- RLS verified for any new table.
- Works on a 360 px phone and desktop, in light and dark mode.
- Loading, empty and error states handled.
- Reviewed and merged through a pull request.

## 18. Open Questions

- Single-user only at launch, or open sign-up for other people?
- Which source for exchange rates (manual, public API)?
- Is Khmer language needed in version 1?
- Should rollover budgets be in the MVP or Phase 2?

## 19. Glossary

- **RLS:** Row Level Security, database rules that limit which rows a user can access.
- **Minor units:** the smallest currency unit (cents for USD, riel for KHR).
- **RPC:** calling a database function from the client.
- **PWA:** Progressive Web App, a website that installs like an app.
- **Idempotent:** safe to run more than once with the same result.
