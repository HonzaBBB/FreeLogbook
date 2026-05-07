# FreeLogbook — Pilot Logbook

Minimalist web-based pilot logbook for professional pilots.

Current production is deployed on Netlify.

## Project Status

- **Current mode:** local-first app (browser `localStorage`)
- **Current production hosting:** Netlify
- **Current backend:** none
- **Planned next step:** Supabase auth + cloud sync (MVP)

## Features

- Flight log table (sortable, filterable, ICAO-style columns)
- Manual flight entry with smart defaults
- JetBee XLS import
- Night time calculation (NOAA civil twilight)
- Printable logbook (Czech CAA / ICAO format, A4 landscape)
- Dashboard stats (totals, PIC, night, IFR, monthly/yearly)
- Settings (pilot info, custom airports, JSON backup/restore)

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- SheetJS (`xlsx`) for import
- Leaflet / React-Leaflet (map view)
- `localStorage` persistence

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Build

```bash
npm run build
```

Output is generated into `dist/`.

## Deployment (Netlify)

This app is deployed as a static site.

Recommended Netlify settings:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** `20` (recommended for consistency)

## Environment Variables

### Current (local-only mode)

No required env vars.

### Planned (Supabase MVP: login + sync)

When cloud sync is enabled, add:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Important:

- Never expose Supabase `service_role` key in frontend.
- Keep `anon` key only in client app.

## Authentication URL Configuration (for Supabase)

When enabling auth:

- Set **Site URL** to production domain (Netlify custom domain)
- Add redirect URLs for:
  - local dev (`http://localhost:5173/*`)
  - production (`https://your-domain/*`)

## Data & Backups

All current data is stored in browser `localStorage`.

To avoid data loss:

1. Go to **Settings → Export JSON Backup**
2. Store backups outside browser (cloud disk / local file storage)
3. Test restore periodically using **Settings → Import JSON Backup**

## Security Notes

- In local-only mode, there is no server-side protection (single-user browser storage).
- After moving to Supabase, Row Level Security (RLS) must be enabled for all user data tables.
- Do not rely on frontend filtering for data isolation.

## Troubleshooting

- If app is blank after deploy, verify Netlify publish directory is `dist`.
- If imports fail, verify XLS format from JetBee and browser console errors.
- If data "disappears", check whether browser storage was cleared or app opened in a different browser profile.

## License

Free to use and modify.
