-- Schedule Hub RLS policies

create or replace function public.current_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.team_id
  from public.employees e
  where e.id = auth.uid();
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = auth.uid()
      and e.role = 'manager'
      and e.team_id is not null
  );
$$;

create or replace function public.current_department_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select e.department
  from public.employees e
  where e.id = auth.uid();
$$;

grant execute on function public.current_team_id() to authenticated;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.current_department_name() to authenticated;

alter table public.teams enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.swap_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.message_posts enable row level security;

-- Reset policies so this file can be re-run safely during migrations.
drop policy if exists "teams_select_own_team" on public.teams;
drop policy if exists "teams_update_manager_same_team" on public.teams;
drop policy if exists "teams_delete_manager_same_team" on public.teams;

drop policy if exists "departments_select_team_scope" on public.departments;
drop policy if exists "departments_modify_manager_same_team" on public.departments;

drop policy if exists "employees_select_self_or_team_manager" on public.employees;
drop policy if exists "employees_update_manager_same_team" on public.employees;
drop policy if exists "employees_insert_manager_same_team" on public.employees;
drop policy if exists "employees_delete_manager_same_team" on public.employees;
drop policy if exists "employees_select_self_or_manager" on public.employees;
drop policy if exists "employees_update_self_or_manager" on public.employees;
drop policy if exists "employees_update_manager_only" on public.employees;
drop policy if exists "employees_insert_manager" on public.employees;
drop policy if exists "employees_delete_manager" on public.employees;

drop policy if exists "shifts_select_team_scope" on public.shifts;
drop policy if exists "shifts_modify_manager_same_team" on public.shifts;
drop policy if exists "shifts_select_self_or_manager" on public.shifts;
drop policy if exists "shifts_modify_manager_only" on public.shifts;

drop policy if exists "swap_requests_select_team_scope" on public.swap_requests;
drop policy if exists "swap_requests_insert_own_shift" on public.swap_requests;
drop policy if exists "swap_requests_update_manager_same_team" on public.swap_requests;
drop policy if exists "swap_requests_select_requester_or_manager" on public.swap_requests;
drop policy if exists "swap_requests_insert_own_shift_only" on public.swap_requests;
drop policy if exists "swap_requests_update_manager_only" on public.swap_requests;

drop policy if exists "notifications_select_team_scope" on public.notifications;
drop policy if exists "notifications_modify_manager_same_team" on public.notifications;
drop policy if exists "notifications_insert_team_member_targeted" on public.notifications;
drop policy if exists "notifications_update_target_same_team" on public.notifications;
drop policy if exists "notifications_select_recipient_scope" on public.notifications;
drop policy if exists "notifications_update_recipient_same_team" on public.notifications;
drop policy if exists "notifications_select_target_or_all" on public.notifications;
drop policy if exists "notifications_modify_manager_only" on public.notifications;

drop policy if exists "message_posts_select_team_scope" on public.message_posts;
drop policy if exists "message_posts_insert_authenticated_team" on public.message_posts;
drop policy if exists "message_posts_update_author_or_manager" on public.message_posts;
drop policy if exists "message_posts_delete_author_or_manager" on public.message_posts;
drop policy if exists "message_posts_select_authenticated" on public.message_posts;
drop policy if exists "message_posts_insert_authenticated" on public.message_posts;

-- Teams policies
create policy "teams_select_own_team"
on public.teams
for select
using (
  id = public.current_team_id()
);

create policy "teams_update_manager_same_team"
on public.teams
for update
using (
  public.is_manager() and id = public.current_team_id()
)
with check (
  public.is_manager() and id = public.current_team_id()
);

create policy "teams_delete_manager_same_team"
on public.teams
for delete
using (
  public.is_manager() and id = public.current_team_id()
);

-- Departments policies
create policy "departments_select_team_scope"
on public.departments
for select
using (
  team_id = public.current_team_id()
);

create policy "departments_modify_manager_same_team"
on public.departments
for all
using (
  public.is_manager() and team_id = public.current_team_id()
)
with check (
  public.is_manager() and team_id = public.current_team_id()
);

-- Employees policies
create policy "employees_select_self_or_team_manager"
on public.employees
for select
using (
  id = auth.uid()
  or (
    public.is_manager()
    and team_id = public.current_team_id()
  )
  or (
    team_id = public.current_team_id()
    and public.current_department_name() is not null
    and department = public.current_department_name()
  )
);

create policy "employees_update_manager_same_team"
on public.employees
for update
using (
  public.is_manager()
  and team_id = public.current_team_id()
)
with check (
  public.is_manager()
  and team_id = public.current_team_id()
);

create policy "employees_insert_manager_same_team"
on public.employees
for insert
with check (
  public.is_manager()
  and team_id = public.current_team_id()
);

create policy "employees_delete_manager_same_team"
on public.employees
for delete
using (
  public.is_manager()
  and team_id = public.current_team_id()
);

-- Shifts policies
create policy "shifts_select_team_scope"
on public.shifts
for select
using (
  exists (
    select 1
    from public.employees e
    where e.id = public.shifts.employee_id
      and e.team_id = public.current_team_id()
      and (
        public.is_manager()
        or public.shifts.employee_id = auth.uid()
        or (
          public.current_department_name() is not null
          and e.department = public.current_department_name()
        )
      )
  )
);

create policy "shifts_modify_manager_same_team"
on public.shifts
for all
using (
  public.is_manager()
  and exists (
    select 1
    from public.employees e
    where e.id = public.shifts.employee_id
      and e.team_id = public.current_team_id()
  )
)
with check (
  public.is_manager()
  and exists (
    select 1
    from public.employees e
    where e.id = public.shifts.employee_id
      and e.team_id = public.current_team_id()
  )
);

-- Swap request policies
create policy "swap_requests_select_team_scope"
on public.swap_requests
for select
using (
  requested_by = auth.uid()
  or (
    public.is_manager()
    and exists (
      select 1
      from public.shifts s
      join public.employees e on e.id = s.employee_id
      where s.id = public.swap_requests.shift_id
        and e.team_id = public.current_team_id()
    )
  )
);

create policy "swap_requests_insert_own_shift"
on public.swap_requests
for insert
with check (
  requested_by = auth.uid()
  and exists (
    select 1
    from public.shifts s
    join public.employees e on e.id = s.employee_id
    where s.id = shift_id
      and s.employee_id = auth.uid()
      and e.team_id = public.current_team_id()
  )
);

create policy "swap_requests_update_manager_same_team"
on public.swap_requests
for update
using (
  public.is_manager()
  and exists (
    select 1
    from public.shifts s
    join public.employees e on e.id = s.employee_id
    where s.id = public.swap_requests.shift_id
      and e.team_id = public.current_team_id()
  )
)
with check (
  public.is_manager()
  and exists (
    select 1
    from public.shifts s
    join public.employees e on e.id = s.employee_id
    where s.id = public.swap_requests.shift_id
      and e.team_id = public.current_team_id()
  )
);

-- Notifications policies
create policy "notifications_select_recipient_scope"
on public.notifications
for select
using (
  team_id = public.current_team_id()
  and recipient_employee_id = auth.uid()
);

create policy "notifications_insert_team_member_targeted"
on public.notifications
for insert
with check (
  auth.uid() is not null
  and team_id = public.current_team_id()
  and recipient_employee_id is not null
  and exists (
    select 1
    from public.employees recipient
    where recipient.id = public.notifications.recipient_employee_id
      and recipient.team_id = public.current_team_id()
      and (
        public.is_manager()
        or recipient.role = 'manager'
      )
  )
);

create policy "notifications_update_recipient_same_team"
on public.notifications
for update
using (
  auth.uid() is not null
  and team_id = public.current_team_id()
  and recipient_employee_id = auth.uid()
)
with check (
  auth.uid() is not null
  and team_id = public.current_team_id()
  and recipient_employee_id = auth.uid()
);

-- Message board policies
create policy "message_posts_select_team_scope"
on public.message_posts
for select
using (
  auth.uid() is not null
  and team_id = public.current_team_id()
);

create policy "message_posts_insert_authenticated_team"
on public.message_posts
for insert
with check (
  author_id = auth.uid()
  and team_id = public.current_team_id()
);

create policy "message_posts_update_author_or_manager"
on public.message_posts
for update
using (
  team_id = public.current_team_id()
  and (
    author_id = auth.uid()
    or public.is_manager()
  )
)
with check (
  team_id = public.current_team_id()
  and (
    author_id = auth.uid()
    or public.is_manager()
  )
);

create policy "message_posts_delete_author_or_manager"
on public.message_posts
for delete
using (
  team_id = public.current_team_id()
  and (
    author_id = auth.uid()
    or public.is_manager()
  )
);
