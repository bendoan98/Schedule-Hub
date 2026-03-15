-- Schedule Hub RLS policies

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
    where e.id = auth.uid() and e.role = 'manager'
  );
$$;

grant execute on function public.is_manager() to authenticated;

alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.swap_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.message_posts enable row level security;

-- Employees policies
create policy "employees_select_self_or_manager"
on public.employees
for select
using (
  id = auth.uid() or public.is_manager()
);

create policy "employees_update_manager_only"
on public.employees
for update
using (public.is_manager())
with check (public.is_manager());

create policy "employees_insert_manager"
on public.employees
for insert
with check (public.is_manager());

create policy "employees_delete_manager"
on public.employees
for delete
using (public.is_manager());

-- Shifts policies
create policy "shifts_select_self_or_manager"
on public.shifts
for select
using (
  employee_id = auth.uid() or public.is_manager()
);

create policy "shifts_modify_manager_only"
on public.shifts
for all
using (public.is_manager())
with check (public.is_manager());

-- Swap request policies
create policy "swap_requests_select_requester_or_manager"
on public.swap_requests
for select
using (
  requested_by = auth.uid() or public.is_manager()
);

create policy "swap_requests_insert_own_shift_only"
on public.swap_requests
for insert
with check (
  requested_by = auth.uid()
  and exists (
    select 1
    from public.shifts s
    where s.id = shift_id and s.employee_id = auth.uid()
  )
);

create policy "swap_requests_update_manager_only"
on public.swap_requests
for update
using (public.is_manager())
with check (public.is_manager());

-- Notifications policies
create policy "notifications_select_target_or_all"
on public.notifications
for select
using (
  target_employee_id is null
  or target_employee_id = auth.uid()
  or public.is_manager()
);

create policy "notifications_modify_manager_only"
on public.notifications
for all
using (public.is_manager())
with check (public.is_manager());

-- Message board policies
create policy "message_posts_select_authenticated"
on public.message_posts
for select
using (auth.uid() is not null);

create policy "message_posts_insert_authenticated"
on public.message_posts
for insert
with check (author_id = auth.uid());

create policy "message_posts_update_author_or_manager"
on public.message_posts
for update
using (author_id = auth.uid() or public.is_manager())
with check (author_id = auth.uid() or public.is_manager());

create policy "message_posts_delete_author_or_manager"
on public.message_posts
for delete
using (author_id = auth.uid() or public.is_manager());
