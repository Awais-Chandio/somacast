# Somacast

**Body weather for crews beyond Earth.**

Somacast learns each crew member's personal baseline, forecasts the next 72 hours as Clear, Cloudy or Storm, keeps a black-box log during communication blackouts, and hands a structured summary to the flight surgeon when the link returns.

## Quick start

Install once:

```bash
(cd packages/core && npm ci)
(cd apps/mobile && npm ci)
```

Run from the repo root:

```bash
npm test          # core + mobile tests
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

## Important

- All vitals shown in Somacast are **simulated** and labelled as simulated.
- Somacast is **decision support, not a medical device**. It never diagnoses; the flight surgeon decides.

See [docs/conops.md](docs/conops.md) and [docs/requirements.md](docs/requirements.md).

---

Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA.
