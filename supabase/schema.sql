-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)

-- Time entries: one row per timer session
create table if not exists time_entries (
  id uuid default gen_random_uuid() primary key,
  tag text not null default '',
  project text not null default '',
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_minutes numeric not null,
  created_at timestamptz default now()
);

-- Credit rules: configurable earn/spend conversion rates
create table if not exists credit_rules (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type in ('earn', 'spend')),
  credits numeric not null,
  unit text not null check (unit in ('per_hour', 'flat')),
  -- Optional: only apply this earn rule when the project matches this string.
  -- Leave null to apply to all time entries (catch-all).
  project_match text,
  created_at timestamptz default now()
);

-- Seed with two example rules (delete/update these to your liking in the app)
insert into credit_rules (name, type, credits, unit, project_match)
values
  ('Study', 'earn', 0.5, 'per_hour', null),
  ('Movie Night', 'spend', 4, 'flat', null)
on conflict do nothing;

-- Optional: disable Row Level Security for single-user (no auth) setup.
-- If you later add auth, remove these and add proper RLS policies.
alter table time_entries disable row level security;
alter table credit_rules disable row level security;
