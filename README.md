# FreeLogbook — Pilot Logbook

Minimalist web-based pilot logbook for professional pilots. No backend, no subscriptions — all data stored locally in your browser.

## Quick Start

```bash
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Build for Production

```bash
npm run build
```

The `dist/` folder is ready to deploy to Netlify, GitHub Pages, or any static hosting.

## Features

- **Flight log table** — sortable, filterable, all ICAO logbook columns
- **Manual flight entry** — smart defaults for turbine (BE40/BE4W) and SEP aircraft
- **JetBee XLS import** — parse monthly salary reports from JetBee scheduling system
- **Night time calculation** — automatic NOAA civil twilight algorithm based on airport coordinates
- **Printable logbook** — official Czech CAA / ICAO format, landscape A4, via browser print dialog
- **Statistics dashboard** — total hours, PIC, night, IFR, monthly/yearly stats
- **Settings** — pilot name, custom airports, JSON backup/restore

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- SheetJS (xlsx) for XLS/XLSX import
- localStorage for all data persistence
- No backend, no authentication

## Data

All flight data is stored in `localStorage`. Use Settings → Export JSON Backup regularly to avoid data loss.
