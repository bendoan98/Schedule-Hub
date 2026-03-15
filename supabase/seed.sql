-- Seed script for local/dev data.
-- Replace UUIDs below with real auth.users IDs from your Supabase project.

insert into public.teams (id, name, invite_code, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Downtown Ops', 'TEAMOPS1', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into public.employees (id, team_id, name, email, role, department, color_index)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alex Morgan', 'alex.morgan@example.com', 'manager', 'OPERATIONS', 1),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jamie Chen', 'jamie.chen@example.com', 'employee', 'KITCHEN', 0),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sam Rivera', 'sam.rivera@example.com', 'employee', 'DRIVER', 2)
on conflict (id) do nothing;

insert into public.shifts (employee_id, day, start_time, end_time, week_start)
values
  ('22222222-2222-2222-2222-222222222222', 0, '09:00', '17:00', date_trunc('week', now())::date + 1),
  ('22222222-2222-2222-2222-222222222222', 3, '13:00', '21:00', date_trunc('week', now())::date + 1),
  ('33333333-3333-3333-3333-333333333333', 1, '07:00', '15:00', date_trunc('week', now())::date + 1)
on conflict do nothing;

insert into public.message_posts (team_id, author_id, kind, message)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'announcement', 'Welcome to the new schedule workspace.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'comment', 'Thanks, got it!')
on conflict do nothing;
