# Somacast

**Body weather for crews beyond Earth.**

Somacast learns each crew member's personal baseline, forecasts the next 72 hours as Clear, Cloudy or Storm, keeps a black-box log during communication blackouts, and hands a structured summary to the flight surgeon when the link returns.

## Quick start

Install once:

```bash
(cd packages/core && npm ci)
(cd apps/mobile && npm ci)
(cd apps/web && npm ci)
```

Run from the repo root:

```bash
npm test          # core + mobile + web tests
npm start         # Metro bundler (keep this terminal open)
npm run android   # in a second terminal: build and launch on Android
```

React Native commands such as `npx react-native run-android` only work inside `apps/mobile`, not at the repo root.

## Project structure

```
packages/core/src/          Pure TypeScript, shared by mobile and web (the "model" of the system)
  domain/                   Metrics catalogue and Zod schemas (reading, alert, forecast)
  simulation/               Seeded simulator and scenarios (all data simulated)
  engine/                   Baseline, z-score anomalies, 72 h forecast (rules only)
  coach/                    Crew actions and the SBAR handoff (rules only)
  sync/                     Black-box outbox and idempotent sync
  copy/                     Space / Earth wording (Earth mode changes words only)
  design/                   Brand tokens and contrast check
  index.ts                  Public API; apps import only from here

apps/mobile/src/            React Native app, feature-first MVC
  app/                      App root (providers, status bar)
  config/                   Mission settings (seed, days, scenarios)
  shared/
    components/             Reusable UI (Chip, StepButton, SimulatedBadge, SectionLabel)
    model/                  Shared data helpers (simulateMission)
    theme/                  Phone type scale, heading font
  features/today/
    model/                  Pure: simulation -> worded, formatted view data
    controller/             Hook that owns screen state and actions
    view/                   Screen and its components, layout only

apps/web/src/               Ground console for flight surgeons (React + Vite), see apps/web/README.md
  data/                     Pure: Supabase rows -> readings -> core assess(); Supabase calls
  features/                 auth, overview (crew cards), crew (alerts, sparklines, LOS timeline, notes)
  shared/                   Shell (SIMULATED DATA badge, footer), weather status, formatting
```

Ground console: `npm run web` (needs `apps/web/.env`, see `apps/web/.env.example`).

## How to verify

After the install step above, from the repo root:

```bash
npm test            # all automated tests: core (Jest), mobile (Jest), web (Vitest)
npm run rls-check   # live Supabase: 17 checks that each user sees and writes only what RLS allows
```

`rls-check` needs `apps/mobile/.env` (Supabase URL and anon key) and `scripts/.env` (demo passwords); see [supabase/seed-users.md](supabase/seed-users.md). It never uses the service-role key and writes only to the test crew `ZZ-TEST`.

Each requirement, the test or demo step that checks it, and its honest status: [docs/verification.md](docs/verification.md). What Somacast does not do yet: [docs/limitations.md](docs/limitations.md).

## Earth mode

A **Space / Earth** switch on the phone (Today screen) and in the console header rewords the app for a remote team on Earth: LOS becomes "Offline", flight surgeon becomes "remote doctor". The logic does not change. See [docs/earth-mode.md](docs/earth-mode.md).

## Important

- All vitals shown in Somacast are **simulated** and labelled as simulated.
- Somacast is **decision support, not a medical device**. It never diagnoses; the flight surgeon decides.

See [docs/conops.md](docs/conops.md), [docs/requirements.md](docs/requirements.md) and [docs/limitations.md](docs/limitations.md).

---

Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA.
