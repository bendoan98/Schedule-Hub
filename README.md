# Schedule-Hub
A browser-based employee scheduling application that imports CSV schedules and turns them into an interactive shared calendar with role-based access, shift management, and swap request workflows.

Powered by **Supabase** — no custom backend server required.

---

## Features

### Core
- **CSV Import** — Upload a CSV file to instantly populate the weekly schedule. Accepts `role`, `employee_name`, `monday` to `sunday` columns.
- **Weekly Calendar Grid** — 7-day view with color-coded shifts per employee, week navigation, and today's date highlighted.
- **Role-Based Access** — Manager and Employee roles with separate experiences. Managers can add, edit, and delete shifts; employees can view their own schedule and request swaps.
- **Shift Editing** — Managers can click any shift to edit time or assignee, or use the `+` button to add new shifts directly to any cell.

### Stretch Goals (Implemented)
- **Shift Swap Requests** — Employees can request a swap on any of their shifts. Requests are flagged on the grid and routed to a manager approval queue.
- **In-App Notifications** — Bell icon with unread count. Notifications fire on swap requests and approvals, and are clearable with "mark all read."
- **Message Board** — Shared announcement board where managers can post notes and employees can leave comments visible to the whole team.
- **Calendar Export** — Export personal or full-team schedules to Apple Calendar (.ics) or Google Calendar.

### Dashboard Stats
- Total shifts scheduled for the week
- Total hours across all employees
- Count of pending swap requests
- Roster size

---

## Architecture

ShiftSync uses **Supabase** as its sole backend — no custom API server is needed. The frontend communicates directly with Supabase via the official JavaScript SDK.

```
Browser (ShiftSync UI)
    ↓ supabase-js SDK
Supabase
    ├── Auth         — email/password login, JWT session management
    ├── Database     — PostgreSQL: shifts, employees, swap_requests
    ├── Row-Level Security — manager vs. employee permissions at DB layer
    ├── Realtime     — live push updates for swap requests and notifications
    └── Edge Functions — serverless functions for email alerts, business logic
```

This means zero backend servers to host or maintain. Edge Functions are added on demand for logic that shouldn't run in the browser (e.g. sending notification emails when a swap is requested).

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 |
| Styling | Custom CSS with CSS variables (dark theme) |
| Typography | IBM Plex Sans + IBM Plex Mono |
| Backend & Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + JWT) |
| Realtime | Supabase Realtime (Postgres change streams) |
| Serverless Logic | Supabase Edge Functions (Deno / TypeScript) |
| CSV Parsing | Native JavaScript `FileReader` API |

---

## Database Schema

Three core tables in Supabase:

**`employees`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Full name |
| `email` | text | Used for Supabase Auth |
| `role` | text | `manager` or `employee` |
| `department` | text | e.g. FLOOR, BAR, OPS |
| `color_index` | integer | UI color assignment (0–7) |

**`shifts`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `employee_id` | uuid | Foreign key → employees |
| `day` | integer | 0 = Monday, 6 = Sunday |
| `start_time` | time | 24h format |
| `end_time` | time | 24h format |
| `week_start` | date | Monday of the scheduled week |

**`swap_requests`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `shift_id` | uuid | Foreign key → shifts |
| `requested_by` | uuid | Foreign key → employees |
| `reason` | text | Optional employee note |
| `status` | text | `pending`, `approved`, `denied` |
| `created_at` | timestamptz | Auto-set |

---

## Row-Level Security

Supabase RLS policies enforce permissions at the database layer — the frontend never needs to filter data manually.

- **Managers** can read and write all rows across all tables
- **Employees** can read only their own shifts and submit swap requests on their own shifts
- **Swap requests** are readable by the requesting employee and all managers

---

## CSV Format

```
role,employee_name,monday,tuesday,wednesday,thursday,friday,saturday,sunday
employee,Jamie Chen,09:00-17:00,09:00-17:00,,13:00-21:00,,09:00-17:00,
manager,Alex Morgan,,,,,,,
employee,Sam Rivera,,07:00-15:00,,07:00-15:00,,15:00-23:00,
```

| Column | Type | Description |
|---|---|---|
| `role` | string | `manager` or `employee` |
| `employee_name` | string | Full name matching the roster |
| `monday` – `sunday` | HH:MM-HH:MM | Shift time range for that day, or empty if not scheduled |

---

## Roles

| Role | Permissions |
|---|---|
| **Manager** | View all employees, add/edit/delete shifts, import CSV, approve or deny swap requests |
| **Employee** | View own schedule, request shift swaps |

---

## Shift Swap Workflow

1. Employee clicks a shift block on their schedule
2. Employee submits a swap request (with optional reason)
3. Request is written to `swap_requests` table with status `pending`
4. Shift is flagged as **PENDING** on the grid (live via Realtime)
5. Manager sees the request in the Swap Requests sidebar and approves or denies
6. Status updates to **APPROVED** or **DENIED** on the grid in real time
7. An Edge Function triggers a notification email to both parties

---

## Getting Started

### Prerequisites
- A [Supabase](https://supabase.com) project (free tier works)
- Your Supabase project URL and anon public key

### Setup

1. Create the three tables above in your Supabase project using the SQL editor
2. Enable Row-Level Security on each table and apply the policies described above
3. Add your Supabase credentials to the app:

```js
const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-public-key'
);
```

4. Open the HTML file in a browser or deploy to any static host (Vercel, Netlify, GitHub Pages)

---

## Roadmap

- [ ] CSV import and parsing
- [ ] Weekly calendar grid
- [ ] Role-based access (manager / employee)
- [ ] Shift editing and management
- [ ] Shift swap requests
- [ ] In-app notifications
- [ ] Wire frontend to Supabase (auth, data, realtime)
- [ ] Supabase Edge Function for swap email notifications
- [ ] Message board for team announcements
- [ ] Export schedule to Apple Calendar (.ics) or Google Calendar
- [ ] Mobile-optimized layout
- [ ] Monthly overview
- [ ] Shift conflict detection
- [ ] Employee availability preferences
