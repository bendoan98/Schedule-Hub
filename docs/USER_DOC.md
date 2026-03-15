# Schedule Hub User Doc

## Overview
Schedule Hub helps teams manage weekly schedules with role-based access:
- employees view schedules and request swaps
- managers import schedules, manage departments, and approve requests

## Account and Team Setup
1. Sign up with `Full Name`, `Email`, and `Password`.
2. After first sign-in, choose one:
   - `Create Team` (you become manager), or
   - `Join Team` using an invite code.
3. If available in your deployment, you can also sign in with Google/Facebook.

## Roles
### Employee
- Can view their own schedule and coworkers in the same department.
- Can create schedule/swap requests for their own shifts.
- Cannot edit shifts directly.

### Manager
- Can switch between `Schedule` and `Manager Page`.
- Can edit shifts.
- Can import schedules via CSV.
- Can add/rename/delete departments.
- Can update team member departments (including their own).
- Can approve/deny schedule requests.

## Schedule Page
- Weekly Monday-Sunday calendar.
- `Prev` / `Next` week navigation.
- `Export` options:
  - Export Personal (`.ics`)
  - Export Team (`.ics`, manager only)
  - Open next shift in Google Calendar
- Message board appears on this page.

## Manager Page
- CSV import with selectable target week (`Week of`).
- Schedule request queue.
- Department manager panel.
- Team roster panel for department assignment.

## Notifications
- Notification bell shows unread count.
- Click outside closes the notification popover.
- `Mark all read` applies to your own account only.
- Notifications are individualized by recipient.

Current notification triggers:
- CSV import -> `New Schedule Available` to employees.
- Department update/rename/delete -> affected employees only.
- Schedule request submission -> managers.
- Schedule request approval/denial -> addressed employee(s).

## CSV Import Format
Required columns:
- `role`
- `employee_name`
- `monday` `tuesday` `wednesday` `thursday` `friday` `saturday` `sunday`

Example:

```csv
role,employee_name,monday,tuesday,wednesday,thursday,friday,saturday,sunday
employee,Jamie Chen,09:00-17:00,09:00-17:00,,13:00-21:00,,09:00-17:00,
manager,Alex Morgan,,,,,,,
employee,Sam Rivera,,07:00-15:00,,07:00-15:00,,15:00-23:00,
```

Notes:
- Time format: `HH:MM-HH:MM`.
- Imported shifts are applied to the selected week.
- Unknown employee names are skipped when running with Supabase team data.
