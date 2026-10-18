-- Keep-Alive Heartbeat Table & Function
-- Prevents Supabase database inactivity pause & records connectivity health.

create table if not exists project_heartbeats (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'cron',
  pinged_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

-- Index for pruning old pings
create index if not exists idx_heartbeats_pinged_at on project_heartbeats (pinged_at desc);

-- Function to record heartbeat and automatically prune logs older than 30 days
create or replace function supabase_keep_alive(p_source text default 'scheduler')
returns timestamptz
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
begin
  -- 1. Insert keep-alive heartbeat ping
  insert into project_heartbeats (source, pinged_at)
  values (p_source, v_now);

  -- 2. Clean up records older than 30 days to keep table compact
  delete from project_heartbeats
  where pinged_at < (v_now - interval '30 days');

  return v_now;
end;
$$;

-- Enable pg_cron schedule if pg_cron extension is installed
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Schedule in-database keep-alive ping every 3 days at 03:00 UTC
    perform cron.schedule(
      'keep-supabase-active-heartbeat',
      '0 3 */3 * *',
      'select supabase_keep_alive(''pg_cron'')'
    );
  end if;
exception when others then
  -- Silently skip if pg_cron is not configured
  null;
end;
$$;
