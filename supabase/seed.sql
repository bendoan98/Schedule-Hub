-- Seed script for local/dev data.
-- Replace UUIDs below with real auth.users IDs from your Supabase project.

insert into public.employees (id, name, email, role, department, color_index)
values
  ('11111111-1111-1111-1111-111111111111', 'Alex Morgan', 'alex.morgan@example.com', 'manager', 'OPERATIONS', 1),
  ('22222222-2222-2222-2222-222222222222', 'Jamie Chen', 'jamie.chen@example.com', 'employee', 'KITCHEN', 0),
  ('33333333-3333-3333-3333-333333333333', 'Sam Rivera', 'sam.rivera@example.com', 'employee', 'DRIVER', 2)
on conflict (id) do nothing;

insert into public.shifts (employee_id, day, start_time, end_time, week_start)
values
  ('22222222-2222-2222-2222-222222222222', 0, '09:00', '17:00', date_trunc('week', now())::date + 1),
  ('22222222-2222-2222-2222-222222222222', 3, '13:00', '21:00', date_trunc('week', now())::date + 1),
  ('33333333-3333-3333-3333-333333333333', 1, '07:00', '15:00', date_trunc('week', now())::date + 1)
on conflict do nothing;
