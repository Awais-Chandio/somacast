# Somacast ground console (apps/web)

The flight surgeon's view (Phase 8). React + Vite + TypeScript, the same Supabase project as the
phone, and the same engine (`@somacast/core`). All vitals are **simulated**. Decision support only,
not a medical device; thresholds are illustrative.

## Run

```sh
cp .env.example .env   # Supabase URL + anon key only (same values as apps/mobile/.env)
npm install
npm run dev            # http://localhost:5173
```

Sign in as a `surgeon` account (see `supabase/seed-users.md`). A `crew` account is told the console is
for flight surgeons; RLS would also limit it to its own crew's rows.

## What it shows

| Screen | Content |
|---|---|
| Crew overview | One card per `crew_id` in `log_entries` (crews starting with `ZZ-` are hidden): name, last sync, rows received, 72 h forecast word + icon |
| Crew detail | Alerts with metric, value, usual, z, days and reason; a 14-day sparkline per metric (with a table view); a timeline of LOS gaps; uplink notes |

The forecast and alerts are **recomputed in the browser** with core `assess()` from the synced daily
readings. Nothing stored (state or alert rows) is trusted. Readings from different simulated scenarios
are never mixed: the scenario received most recently wins. The demo backlog rows are not daily
readings and are skipped.

An LOS gap is 15 min or more with no row received (illustrative). Uplink notes are plain text; they
are never rendered as HTML.

## Checks

```sh
npm test            # vitest: rows -> readings -> assess, sparklines, LOS timeline, note checks
npm run typecheck   # tsc
npm run format:check
```
