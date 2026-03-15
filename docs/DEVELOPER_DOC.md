# Schedule Hub Developer Doc

## Tech Stack
- React 18 + Vite
- Supabase (Postgres, Auth, Realtime)
- `date-fns`
- Vitest + V8 coverage

## Prerequisites
- Node.js 18+
- npm
- Supabase project (optional in mock mode)

## Local Setup
Install dependencies:

```bash
npm install
```

Create env file:

```bash
cp .env.example .env.local
```

Set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If env vars are missing, app runs in local mock mode.

## Scripts
Run dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

Run tests:

```bash
npm test
```

Watch tests:

```bash
npm run test:watch
```

Run coverage:

```bash
npm run coverage
```

Coverage output:
- `coverage/index.html`
- `coverage/coverage-summary.json`
- console text report

## Supabase Setup
Run SQL in this order:
1. `supabase/schema.sql`
2. `supabase/rls.sql`
3. `supabase/seed.sql` (optional)

Then:
1. Start app and sign up/sign in.
2. Create team or join with invite code.

## Current Data Model
Core tables:
- `teams`
- `departments`
- `employees`
- `shifts`
- `swap_requests`
- `notifications`
- `message_posts`

Notable functions/triggers:
- `handle_new_user` trigger creates employee profile.
- `create_team_for_current_user(text)`
- `join_team_with_invite_code(text)`

## RLS Summary
- Team-scoped access via `current_team_id()`.
- Managers can manage team data.
- Employees can read own profile and same-department peers.
- Employees can only request swaps for their own shifts.
- Notifications are per-recipient and read state is per-user.
- `employees.department_id` references `departments.id` with `ON DELETE SET NULL`.

## Project Structure
```text
src/
  features/
    manager/
    schedule/
    team/
    swaps/
    notifications/
    export/
    board/
  lib/
    supabaseClient.js
    supabaseData.js
  utils/
    *.js
    *.test.js
supabase/
  schema.sql
  rls.sql
  seed.sql
docs/
  USER_DOC.md
  DEVELOPER_DOC.md
```
