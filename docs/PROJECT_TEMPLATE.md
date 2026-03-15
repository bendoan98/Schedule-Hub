# Schedule Hub Project Template

This repository now includes a full starter template based on `README.md`:

- React 18 + Vite frontend
- Supabase client bootstrap (`src/lib/supabaseClient.js`)
- Weekly calendar grid with role-specific behavior
- CSV import parser and uploader
- Shift add/edit/delete modal
- Shift swap workflow UI (request + approval queue)
- Notification bell with unread count
- Message board (announcements + comments)
- Calendar export (.ics + Google Calendar open link)
- Supabase SQL templates in `/supabase`

## Local Run

1. Install packages:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
```

3. Add your values in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

4. Start dev server:

```bash
npm run dev
```

## Supabase Setup

Run SQL in this order:

1. `supabase/schema.sql`
2. `supabase/rls.sql`
3. `supabase/seed.sql` (optional)

If your auth users already exist, replace placeholder UUIDs in `seed.sql` with real `auth.users.id` values.

`schema.sql` includes an auth trigger that auto-creates an `employees` row for new signups (default role: `employee`).

## Current Integration

The template supports both:

- Mock mode when Supabase env vars are missing.
- Live Supabase mode with email/password sign-in, sign-up, CRUD, and realtime sync.
