-- Profile names & avatars
-- Stores the display name collected at sign-up (or provided by Google) so the
-- app can greet the user and show who is signed in. Additive and idempotent.

alter table profiles
  add column if not exists full_name text,
  add column if not exists avatar_url text;

-- Backfill existing users from their auth metadata
update profiles p
set
  full_name = coalesce(p.full_name, nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')), '')),
  avatar_url = coalesce(p.avatar_url, u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where u.id = p.id;

-- New-user trigger: same defaults as before, now also copies name/avatar.
-- Requires 20261021000001_account_balances.sql (accounts.kind).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_cash_account_id uuid;
begin
  -- Create profile
  -- Name comes from the sign-up form (full_name) or Google (full_name / name)
  insert into public.profiles (id, main_currency, timezone, week_starts_on, full_name, avatar_url)
  values (
    new.id, 'USD', 'Asia/Phnom_Penh', 1,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')), ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;

  -- Create default cash account
  insert into public.accounts (user_id, name, kind, currency)
  values (new.id, 'Cash', 'cash', 'USD')
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

