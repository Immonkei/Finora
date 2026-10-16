-- Finora: Automated Daily Recurring Rules Job (Spec 9.5 & FR-R2)
-- Migration: 20261010000001_recurring_cron.sql

-- 1. Function to process due recurring rules
create or replace function process_due_recurring_rules()
returns integer
language plpgsql
security definer
as $$
declare
  processed_count integer := 0;
  r record;
  v_next_run date;
  v_occurred_at timestamptz;
begin
  for r in
    select *
    from recurring_rules
    where active = true
      and next_run <= current_date
  loop
    v_occurred_at := (r.next_run::text || ' 00:00:00+00')::timestamptz;

    -- Insert due transaction with duplicate guard
    insert into transactions (
      user_id,
      recurring_id,
      type,
      amount,
      currency,
      exchange_rate,
      base_amount,
      account_id,
      category_id,
      note,
      occurred_at
    )
    values (
      r.user_id,
      r.id,
      r.type,
      r.amount,
      r.currency,
      1.0,
      r.amount,
      r.account_id,
      r.category_id,
      coalesce('[Recurring] ' || r.note, '[Recurring]'),
      v_occurred_at
    )
    on conflict (recurring_id, occurred_at) do nothing;

    processed_count := processed_count + 1;

    -- Advance next_run according to frequency
    if r.frequency = 'daily' then
      v_next_run := r.next_run + interval '1 day';
    elsif r.frequency = 'weekly' then
      v_next_run := r.next_run + interval '1 week';
    elsif r.frequency = 'monthly' then
      v_next_run := r.next_run + interval '1 month';
    else
      v_next_run := r.next_run + interval '1 month';
    end if;

    -- Check if next_run exceeds end_date
    update recurring_rules
    set
      next_run = v_next_run,
      active = (r.end_date is null or v_next_run <= r.end_date)
    where id = r.id;
  end loop;

  return processed_count;
end;
$$;

-- 2. Schedule via pg_cron if extension is available
do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    perform cron.unschedule('finora-process-recurring');
  exception
    when others then null;
  end;

  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    perform cron.schedule(
      'finora-process-recurring',
      '0 0 * * *',
      'select process_due_recurring_rules();'
    );
  end if;
end $$;
