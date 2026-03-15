-- Schedule Hub schema
-- Run this in Supabase SQL editor after creating auth users.

create extension if not exists pgcrypto;

create table if not exists public.employees (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('manager', 'employee')),
  department text not null default 'UNASSIGNED',
  color_index integer not null default 0 check (color_index between 0 and 7),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  day integer not null check (day between 0 and 6),
  start_time time not null,
  end_time time not null,
  week_start date not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint shifts_time_check check (start_time < end_time)
);

create index if not exists shifts_week_start_idx on public.shifts (week_start);
create index if not exists shifts_employee_week_idx on public.shifts (employee_id, week_start);

create table if not exists public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  requested_by uuid not null references public.employees (id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists swap_requests_status_idx on public.swap_requests (status);
create index if not exists swap_requests_requester_idx on public.swap_requests (requested_by);

-- Optional stretch feature tables.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  target_employee_id uuid references public.employees (id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.message_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.employees (id) on delete cascade,
  kind text not null default 'comment' check (kind in ('announcement', 'comment')),
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);
