# Schedule Hub

Schedule Hub is a React + Supabase app for team scheduling.

## Documentation
- User documentation: [docs/USER_DOC.md](docs/USER_DOC.md)
- Developer documentation: [docs/DEVELOPER_DOC.md](docs/DEVELOPER_DOC.md)

## Quick Start
```bash
npm install
cp .env.example .env.local
npm run dev
```

Set in `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If env vars are missing, app runs in local mock-data mode.
