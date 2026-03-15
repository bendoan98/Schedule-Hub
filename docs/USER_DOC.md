# Schedule Hub User Doc

## Overview
Schedule Hub helps teams manage weekly schedules with role-based access:
- employees view schedules and request shift trades with same-department teammates
- managers import schedules, manage departments, and finalize schedule requests

## Account and Team Setup
1. Sign up with `Full Name`, `Email`, and `Password`.
2. After first sign-in, choose one:
   - `Create Team` (you become manager), or
   - `Join Team` using an invite code.
3. If available in your deployment, you can also sign in with Google/Facebook.

## Roles
### Employee
- Can view their own schedule and coworkers in the same department.
- Can click a same-department teammate's shift to request a trade.
- Can accept/deny incoming trade requests addressed to them.
- Cannot edit shifts directly.

### Manager
- Can switch between `Schedule` and `Manager Page`.
- Can edit shifts.
- Can import schedules via CSV.
- Can add/rename/delete departments.
- Can update team member departments (including their own).
- Can final-approve/final-deny requests after teammate review.

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
- Schedule request queue (`PENDING PEER`, `PENDING MANAGER`, `APPROVED`, `DENIED`).
- Department manager panel.
- Team roster panel for department assignment.

## Shift Trade Flow
1. Employee clicks a same-department teammate's shift.
2. Employee selects one of their own shifts to offer and sends request.
3. Target teammate accepts or denies:
   - Accept -> request moves to manager review.
   - Deny -> request closes as denied.
4. Manager final-approves or final-denies:
   - Final approve -> the two shifts are swapped.
   - Final deny -> no shift changes are applied.

## Notifications
- Notification bell shows unread count.
- Click outside closes the notification popover.
- `Mark all read` applies to your own account only.
- Notifications are individualized by recipient.

Current notification triggers:
- CSV import -> `New Schedule Available` to employees.
- Department update/rename/delete -> affected employees only.
- Shift trade request submission -> targeted teammate.
- Teammate accepts request -> managers for final review.
- Teammate denies request -> requester.
- Manager final approval/denial -> both involved employees.

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
