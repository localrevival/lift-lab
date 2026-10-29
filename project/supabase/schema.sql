-- lift lab sync. One shared row, no Supabase Auth.
-- Run in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to run more than once.
--
-- Row Level Security is on and there are no policies, so the anon and
-- authenticated roles cannot read or write. The Vercel function uses the
-- service role key, which bypasses RLS. Do not put that key in the client.

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

revoke all on table public.app_state from anon, authenticated;
