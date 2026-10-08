-- Finora: Personal Finance Tracker Initial Schema
-- Migration: 20261008000001_initial_schema.sql

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Transaction type enum
do $$ begin
  create type tx_type as enum ('expense', 'income', 'transfer');
exception
  when duplicate_object then null;
end $$;

-- 1. Profiles Table
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  main_currency text not null default 'USD',
  timezone text not null default 'Asia/Phnom_Penh',
  week_starts_on smallint not null default 1 check (week_starts_on in (0, 1)),
  reminder_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Accounts Table
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

-- 3. Categories Table
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  color text,
  icon text,
  monthly_budget bigint,
  rollover boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4. Transactions Table
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  type tx_type not null,
  amount bigint not null check (amount > 0),
  currency text not null,
  exchange_rate numeric(18,6) not null default 1,
  base_amount bigint not null,
  account_id uuid not null references accounts on delete cascade,
  to_account_id uuid references accounts on delete set null,
  category_id uuid references categories on delete set null,
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

create index if not exists idx_transactions_user_occurred on transactions (user_id, occurred_at desc);
create index if not exists idx_transactions_user_cat_occurred on transactions (user_id, category_id, occurred_at);
create index if not exists idx_transactions_deleted on transactions (user_id, deleted_at) where deleted_at is null;

-- 5. Budgets Table
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  month date not null,
  total_limit bigint not null,
  unique (user_id, month)
);

-- 6. Savings Goals Table
create table if not exists savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null,
  target_amount bigint not null check (target_amount > 0),
  saved_amount bigint not null default 0,
  deadline date,
  created_at timestamptz not null default now()
);

-- 7. Recurring Rules Table
create table if not exists recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  type tx_type not null,
  amount bigint not null check (amount > 0),
  currency text not null,
  account_id uuid not null references accounts on delete cascade,
  category_id uuid references categories on delete set null,
  note text,
  frequency text not null check (frequency in ('daily','weekly','monthly')),
  start_date date not null,
  end_date date,
  next_run date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 8. Notifications Table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  kind text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 9. Exchange Rates Table
create table if not exists exchange_rates (
  id uuid primary key default gen_random_uuid(),
  from_currency text not null,
  to_currency text not null,
  rate numeric(18,6) not null,
  date date not null,
  created_at timestamptz not null default now(),
  unique (from_currency, to_currency, date)
);

-- ROW LEVEL SECURITY (RLS)
alter table profiles enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table savings_goals enable row level security;
alter table recurring_rules enable row level security;
alter table notifications enable row level security;
alter table exchange_rates enable row level security;

-- Drop existing policies if any
drop policy if exists "own profile" on profiles;
drop policy if exists "own accounts" on accounts;
drop policy if exists "own categories" on categories;
drop policy if exists "own transactions" on transactions;
drop policy if exists "own budgets" on budgets;
drop policy if exists "own savings_goals" on savings_goals;
drop policy if exists "own recurring_rules" on recurring_rules;
drop policy if exists "own notifications" on notifications;
drop policy if exists "exchange_rates read" on exchange_rates;

-- RLS Policies
create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own accounts" on accounts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own categories" on categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own transactions" on transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own budgets" on budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own savings_goals" on savings_goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own recurring_rules" on recurring_rules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own notifications" on notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "exchange_rates read" on exchange_rates
  for select using (auth.role() = 'authenticated');

-- Trigger for default user setup (FR-A4)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_cash_account_id uuid;
begin
  -- Create profile
  insert into public.profiles (id, main_currency, timezone, week_starts_on)
  values (new.id, 'USD', 'Asia/Phnom_Penh', 1)
  on conflict (id) do nothing;

  -- Create default cash account
  insert into public.accounts (user_id, name, currency)
  values (new.id, 'Cash', 'USD')
  returning id into v_cash_account_id;

  -- Create default categories
  insert into public.categories (user_id, name, color, icon) values
    (new.id, 'Food & Drinks', '#EF4444', 'utensils'),
    (new.id, 'Groceries', '#F59E0B', 'shopping-cart'),
    (new.id, 'Transport', '#3B82F6', 'car'),
    (new.id, 'Housing & Bills', '#8B5CF6', 'home'),
    (new.id, 'Entertainment', '#EC4899', 'tv'),
    (new.id, 'Shopping', '#10B981', 'shopping-bag'),
    (new.id, 'Health & Medical', '#06B6D4', 'heart-pulse'),
    (new.id, 'Salary', '#22C55E', 'banknote'),
    (new.id, 'Freelance / Other Income', '#14B8A6', 'briefcase'),
    (new.id, 'Personal Care', '#6366F1', 'sparkles');

  return new;
end;
$$;

-- Trigger attachment to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RPC: Spending by category
create or replace function spending_by_category(p_from timestamptz, p_to timestamptz)
returns table (category_id uuid, category_name text, category_color text, category_icon text, total bigint)
language sql security invoker as $$
  select
    c.id as category_id,
    coalesce(c.name, 'Uncategorized') as category_name,
    c.color as category_color,
    c.icon as category_icon,
    sum(t.base_amount) as total
  from transactions t
  left join categories c on t.category_id = c.id
  where t.type = 'expense'
    and t.deleted_at is null
    and t.occurred_at >= p_from
    and t.occurred_at < p_to
  group by c.id, c.name, c.color, c.icon
  order by total desc;
$$;

-- RPC: Spending by day
create or replace function spending_by_day(p_from timestamptz, p_to timestamptz, p_tz text default 'Asia/Phnom_Penh')
returns table (day date, total bigint)
language sql security invoker as $$
  select
    (t.occurred_at at time zone p_tz)::date as day,
    sum(t.base_amount) as total
  from transactions t
  where t.type = 'expense'
    and t.deleted_at is null
    and t.occurred_at >= p_from
    and t.occurred_at < p_to
  group by 1
  order by 1;
$$;

-- RPC: Top small expenses (spending leaks detection, Spec 9.3)
create or replace function top_small_expenses(p_from timestamptz, p_to timestamptz, p_threshold_minor bigint default 500)
returns table (note text, occurrences bigint, total bigint)
language sql security invoker as $$
  select
    coalesce(t.note, 'Untitled small expense') as note,
    count(*) as occurrences,
    sum(t.base_amount) as total
  from transactions t
  where t.type = 'expense'
    and t.deleted_at is null
    and t.base_amount <= p_threshold_minor
    and t.occurred_at >= p_from
    and t.occurred_at < p_to
  group by coalesce(t.note, 'Untitled small expense')
  having count(*) > 1
  order by total desc
  limit 5;
$$;
