-- Runs in Local Revival's Supabase project. Touches nothing outside lift_lab.
-- One shared row for passcode sync. No Supabase Auth.
-- Safe to run more than once. Replace CHANGE_ME before the first run.
-- The Vercel function connects as lift_lab_app. anon, authenticated, and public cannot.

create schema if not exists lift_lab;

create table if not exists lift_lab.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table lift_lab.app_state enable row level security;

revoke all on schema lift_lab from anon, authenticated, public;
revoke all on table lift_lab.app_state from anon, authenticated, public;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'lift_lab_app') then
    create role lift_lab_app login password 'CHANGE_ME';
  end if;
end
$$;

alter role lift_lab_app set search_path = lift_lab;

grant usage on schema lift_lab to lift_lab_app;
grant select, insert, update on table lift_lab.app_state to lift_lab_app;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'lift_lab'
      and tablename = 'app_state'
      and policyname = 'lift_lab_app_all'
  ) then
    create policy lift_lab_app_all
      on lift_lab.app_state
      for all
      to lift_lab_app
      using (true)
      with check (true);
  end if;
end
$$;
