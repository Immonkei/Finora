-- Accounts & Balances
-- Adds the fields needed to show per-account balances and net worth.
-- Additive only: existing rows get safe defaults, RLS policy "own accounts" still applies.

alter table accounts
  add column if not exists kind text not null default 'cash'
    check (kind in ('cash', 'bank', 'ewallet', 'other')),
  add column if not exists opening_balance bigint not null default 0,
  add column if not exists color text,
  add column if not exists archived_at timestamptz;

create index if not exists idx_accounts_user_active on accounts (user_id) where archived_at is null;
