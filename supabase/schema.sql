-- Schedule Hub schema
-- Run this in Supabase SQL editor.

create extension if not exists pgcrypto;

create or replace function public.generate_invite_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default public.generate_invite_code(),
  departments text[] not null default array['UNASSIGNED']::text[],
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.teams
  add column if not exists name text,
  add column if not exists invite_code text,
  add column if not exists departments text[] default array['UNASSIGNED']::text[],
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists created_at timestamptz not null default timezone('utc', now());

update public.teams
set invite_code = public.generate_invite_code()
where invite_code is null;

create unique index if not exists teams_invite_code_unique_idx on public.teams (invite_code);
alter table public.teams alter column invite_code set default public.generate_invite_code();
alter table public.teams alter column departments set default array['UNASSIGNED']::text[];
update public.teams
set departments = array['UNASSIGNED']::text[]
where departments is null or cardinality(departments) = 0;
alter table public.teams alter column departments set not null;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint departments_team_name_unique unique (team_id, name)
);

create index if not exists departments_team_idx on public.departments (team_id);
create index if not exists departments_team_name_idx on public.departments (team_id, name);

insert into public.departments (team_id, name)
select t.id, dep.name
from public.teams t
cross join lateral unnest(coalesce(t.departments, array['UNASSIGNED']::text[])) as dep(name)
where not exists (
  select 1
  from public.departments d
  where d.team_id = t.id
)
on conflict (team_id, name) do nothing;

create table if not exists public.employees (
  id uuid primary key references auth.users (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  name text not null,
  email text not null unique,
  role text not null default 'employee' check (role in ('manager', 'employee')),
  department_id uuid references public.departments (id) on delete set null,
  color_index integer not null default 0 check (color_index between 0 and 7),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.employees
  add column if not exists team_id uuid references public.teams (id) on delete set null,
  add column if not exists department_id uuid references public.departments (id) on delete set null;
alter table public.employees alter column role set default 'employee';

create index if not exists employees_team_idx on public.employees (team_id);
create index if not exists employees_department_id_idx on public.employees (department_id);

drop trigger if exists sync_employee_department_name_on_department_id on public.employees;
drop function if exists public.sync_employee_department_name_from_id();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'department'
  ) then
    execute $legacy$
      insert into public.departments (team_id, name)
      select distinct e.team_id, e.department
      from public.employees e
      where e.team_id is not null
        and nullif(trim(e.department), '') is not null
      on conflict (team_id, name) do nothing
    $legacy$;

    execute $legacy$
      update public.employees e
      set department_id = d.id
      from public.departments d
      where e.team_id = d.team_id
        and e.department_id is null
        and nullif(trim(e.department), '') is not null
        and upper(trim(e.department)) = upper(trim(d.name))
    $legacy$;

    execute 'alter table public.employees drop column if exists department';
  end if;
end;
$$;

-- Automatically provision an employee profile when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.employees (id, team_id, name, email, role, department_id, color_index)
  values (
    new.id,
    null,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    'employee',
    null,
    floor(random() * 8)::integer
  )
  on conflict (id) do update
    set name = excluded.name,
        email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.create_team_for_current_user(p_team_name text)
returns table(team_id uuid, team_name text, invite_code text, assigned_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_team_id uuid;
  created_team public.teams%rowtype;
  invite_attempts integer := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select e.team_id into current_team_id
  from public.employees e
  where e.id = current_user_id;

  if not found then
    raise exception 'Employee profile not found for current user';
  end if;

  if current_team_id is not null then
    raise exception 'User already belongs to a team';
  end if;

  if trim(coalesce(p_team_name, '')) = '' then
    raise exception 'Team name is required';
  end if;

  loop
    begin
      insert into public.teams (name, created_by, invite_code)
      values (trim(p_team_name), current_user_id, public.generate_invite_code())
      returning * into created_team;

      exit;
    exception
      when unique_violation then
        invite_attempts := invite_attempts + 1;

        if invite_attempts > 5 then
          raise exception 'Unable to generate a unique invite code. Please try again.';
        end if;
    end;
  end loop;

  update public.employees
  set team_id = created_team.id,
      role = 'manager',
      department_id = null
  where id = current_user_id;

  insert into public.departments (team_id, name)
  values (created_team.id, 'UNASSIGNED')
  on conflict on constraint departments_team_name_unique do nothing;

  return query
  select created_team.id, created_team.name, created_team.invite_code, 'manager'::text;
end;
$$;

create or replace function public.join_team_with_invite_code(p_invite_code text)
returns table(team_id uuid, team_name text, invite_code text, assigned_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_team_id uuid;
  requested_team public.teams%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select e.team_id into current_team_id
  from public.employees e
  where e.id = current_user_id;

  if not found then
    raise exception 'Employee profile not found for current user';
  end if;

  if current_team_id is not null then
    raise exception 'User already belongs to a team';
  end if;

  select * into requested_team
  from public.teams t
  where t.invite_code = upper(trim(coalesce(p_invite_code, '')));

  if not found then
    raise exception 'Invalid invite code';
  end if;

  update public.employees
  set team_id = requested_team.id,
      role = 'employee',
      department_id = null
  where id = current_user_id;

  insert into public.departments (team_id, name)
  values (requested_team.id, 'UNASSIGNED')
  on conflict on constraint departments_team_name_unique do nothing;

  return query
  select requested_team.id, requested_team.name, requested_team.invite_code, 'employee'::text;
end;
$$;

grant execute on function public.create_team_for_current_user(text) to authenticated;
grant execute on function public.join_team_with_invite_code(text) to authenticated;

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
  offered_shift_id uuid references public.shifts (id) on delete cascade,
  requested_by uuid not null references public.employees (id) on delete cascade,
  target_employee_id uuid references public.employees (id) on delete cascade,
  reason text,
  status text not null default 'pending_target' check (status in ('pending_target', 'pending_manager', 'approved', 'denied')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.swap_requests
  add column if not exists offered_shift_id uuid references public.shifts (id) on delete cascade,
  add column if not exists target_employee_id uuid references public.employees (id) on delete cascade;

update public.swap_requests
set status = 'pending_manager'
where status = 'pending';

update public.swap_requests r
set target_employee_id = s.employee_id
from public.shifts s
where r.target_employee_id is null
  and s.id = r.shift_id;

alter table public.swap_requests
  drop constraint if exists swap_requests_status_check;

alter table public.swap_requests
  add constraint swap_requests_status_check
  check (status in ('pending_target', 'pending_manager', 'approved', 'denied'));

create index if not exists swap_requests_status_idx on public.swap_requests (status);
create index if not exists swap_requests_requester_idx on public.swap_requests (requested_by);
create index if not exists swap_requests_target_employee_idx on public.swap_requests (target_employee_id);
create index if not exists swap_requests_offered_shift_idx on public.swap_requests (offered_shift_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams (id) on delete cascade,
  recipient_employee_id uuid not null references public.employees (id) on delete cascade,
  sender_employee_id uuid references public.employees (id) on delete set null,
  target_employee_id uuid references public.employees (id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.notifications
  add column if not exists team_id uuid references public.teams (id) on delete cascade,
  add column if not exists recipient_employee_id uuid references public.employees (id) on delete cascade,
  add column if not exists sender_employee_id uuid references public.employees (id) on delete set null,
  add column if not exists read_at timestamptz;

update public.notifications n
set recipient_employee_id = n.target_employee_id
where n.recipient_employee_id is null
  and n.target_employee_id is not null;

update public.notifications n
set team_id = e.team_id
from public.employees e
where n.team_id is null
  and e.id = coalesce(n.recipient_employee_id, n.target_employee_id);

update public.notifications
set read_at = timezone('utc', now())
where read = true
  and read_at is null;

create index if not exists notifications_team_idx on public.notifications (team_id, created_at desc);
create index if not exists notifications_recipient_idx on public.notifications (recipient_employee_id, created_at desc);

create table if not exists public.message_posts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams (id) on delete cascade,
  author_id uuid not null references public.employees (id) on delete cascade,
  author_name text not null default '',
  kind text not null default 'comment' check (kind in ('announcement', 'comment')),
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.message_posts
  add column if not exists team_id uuid references public.teams (id) on delete cascade,
  add column if not exists author_name text default '';

update public.message_posts p
set team_id = e.team_id
from public.employees e
where p.team_id is null
  and p.author_id = e.id;

update public.message_posts p
set author_name = e.name
from public.employees e
where p.author_id = e.id
  and nullif(trim(coalesce(p.author_name, '')), '') is null;

update public.message_posts
set author_name = 'Unknown Employee'
where nullif(trim(coalesce(author_name, '')), '') is null;

alter table public.message_posts
  alter column author_name set default 'Unknown Employee',
  alter column author_name set not null;

create index if not exists message_posts_team_idx on public.message_posts (team_id, created_at desc);
