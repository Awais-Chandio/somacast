# Somacast

**Body weather for crews beyond Earth.**

Somacast learns each crew member's own normal, forecasts the next 72 hours as **Clear, Cloudy or Storm** with the reason, keeps a black-box log while the link to Earth is down, and hands the flight surgeon a structured SBAR summary when it returns.

Somacast is not a sensor. It is the brain on top of the sensors crews already wear: it works offline, knows each person's normal, and hands the doctor a structured report when the link returns. How it would sit in a real mission, and the `ReadingSource` socket that lets the data source change while the engine stays the same: [docs/real-mission.md](docs/real-mission.md).

> All vitals in Somacast are **simulated** and labelled as simulated. The one exception is the optional **Import CSV** source, which reads a bundled example file with made-up values and is labelled "IMPORTED DATA (example file)". Somacast is **decision support, not a medical device**: it never diagnoses, and the flight surgeon decides. Every threshold is illustrative, expert review required.

## Architecture

```mermaid
flowchart LR
  subgraph Phone["Phone app (React Native), works offline"]
    E["@somacast/core engine<br/>baseline, alerts, 72 h forecast"] --> O[("SQLite outbox<br/>black box")]
  end
  O -- "at AOS: batches with idempotency keys" --> S[("Supabase Postgres<br/>append-only log, RLS")]
  S --> W["Web ground console<br/>flight surgeon"]
  W -- "uplink note" --> S
  S -- "notes at the next AOS" --> Phone
```

The engine in `packages/core` is plain TypeScript with no network and no LLM. The phone runs it on device; the console runs the same engine in the browser on the synced readings.

## Quick start

You need Node.js 22.11 or newer, JDK 17, and the Android SDK with an emulator already running (or a phone with USB debugging). See the React Native [environment setup](https://reactnative.dev/docs/set-up-your-environment) for Android. The app is Android only for now.

Install once, from the repo root:

```bash
npm ci                            # root: Supabase client and CLI, used by rls-check and db:push
(cd packages/core && npm ci)
(cd apps/mobile && npm ci)
(cd apps/web && npm ci)
```

npm may print `install-scripts ... not yet covered by allowScripts` warnings. They are safe to ignore: the build and all tests pass without those scripts.

Run from the repo root:

```bash
npm start         # Metro bundler (keep this terminal open)
npm run android   # in a second terminal: build and launch on Android (first build takes a few minutes)
```

On the sign-in screen, **Continue offline** runs the whole phone demo without a backend; no `.env` is needed. React Native commands such as `npx react-native run-android` only work inside `apps/mobile`, not at the repo root.

The sync to Earth and the ground console need a Supabase project:

```bash
cp apps/mobile/.env.example apps/mobile/.env   # phone: Supabase URL + anon key
cp apps/web/.env.example apps/web/.env         # console: same URL + anon key
npm run web                                    # ground console at http://localhost:5173
```

The phone reads its `.env` at bundle time, so after creating or editing it restart Metro with `npm start -- --reset-cache`. Without `apps/web/.env` the console only shows "Supabase is not configured"; it has no offline mode. Demo accounts: [supabase/seed-users.md](supabase/seed-users.md).

## How to verify

```bash
npm test            # all automated tests: core (Jest), mobile (Jest), web (Vitest)
npm run rls-check   # live Supabase: 17 checks that each user sees and writes only what RLS allows
```

`rls-check` needs `apps/mobile/.env` (Supabase URL and anon key) and `scripts/.env` (demo passwords); see [supabase/seed-users.md](supabase/seed-users.md). It never uses the service-role key and writes only to the test crew `ZZ-TEST`.

Each requirement, the test or demo step that checks it, and its honest status: [docs/verification.md](docs/verification.md).

### Engine backtest (simulated data only)

The engine has only been checked against its own simulator: 4 crew, 90 days, scored from day 30. These are not clinical results. Rules and thresholds: [docs/engine.md](docs/engine.md); the bounds are enforced in `packages/core/src/engine/engine.test.ts`.

| Check | Result |
| --- | --- |
| False alerts: normal days, crew-days with any alert (30 seeds) | about 0.1% (7 of 7,200) |
| False not-Clear: normal days, forecast Cloudy or Storm (15 seeds) | about 1.6% (29 of 1,800), never Storm |
| First Storm: blackout decline starts day 45, crew C2 (10 seeds) | day 56 to 64 |
| Blackout, healthy crew C1 | Cloudy from shared cabin CO2, never Storm |
| Solar storm, radiation alert | every crew member on day 62, gone by day 70 |

## Limitations

What Somacast does not do yet, and where every number comes from: [docs/limitations.md](docs/limitations.md) and [docs/data-sources.md](docs/data-sources.md).

## Earth mode

A **Space / Earth** switch on the phone (Today screen) and in the console header rewords the app for a remote team on Earth: LOS becomes "Offline", flight surgeon becomes "remote doctor". Alert reasons, forecasts, coach actions and the handoff are re-worded on screen too; the logic and the stored log do not change. Each device remembers the choice. See [docs/earth-mode.md](docs/earth-mode.md).

## Project structure

```
packages/core/src/          Pure TypeScript, shared by mobile and web
  domain/                   Metrics catalogue and Zod schemas (reading, alert, forecast, handoff)
  simulation/               Seeded simulator and scenarios (all data simulated)
  sources/                  ReadingSource socket: simulator source and CSV import
  engine/                   Baseline, z-score anomalies, 72 h forecast (rules only)
  coach/                    Crew actions and the SBAR handoff (rules only)
  sync/                     Black-box outbox and idempotent sync
  copy/                     Space / Earth wording, and engine sentences written by mode
  design/                   Brand tokens and contrast check
  index.ts                  Public API; apps import only from here

apps/mobile/src/            React Native app, feature-first (model / controller / view)
  app/                      App root (providers, sign-in gate)
  features/                 today, link (LOS/AOS, sync), ground (handoff, notes), auth
  shared/                   Components, theme, Space / Earth wording
  sync/                     SQLite outbox and Supabase transport

apps/web/src/               Ground console for flight surgeons (React + Vite), see apps/web/README.md
  data/                     Pure: Supabase rows -> readings -> core assess(); Supabase calls
  features/                 auth, overview (crew cards), crew (handoff, alerts, sparklines, notes)
  shared/                   Shell (SIMULATED DATA badge, footer), weather status, formatting
```

## Science and data

- [NASA hazard and risk map](docs/nasa-risk-map.md): which NASA human spaceflight risks Somacast tracks a related signal for, and where the gaps are.
- [Data sources](docs/data-sources.md): what is published, what is simulated, what is a guess.
- [Demo vs real mission](docs/real-mission.md): what the demo stands in for, the `ReadingSource` socket and the CSV import format.

## Docs

[ConOps](docs/conops.md) · [Requirements](docs/requirements.md) · [Engine](docs/engine.md) · [Verification](docs/verification.md) · [Limitations](docs/limitations.md) · [Data sources](docs/data-sources.md) · [Demo vs real mission](docs/real-mission.md) · [NASA risk map](docs/nasa-risk-map.md) · [Earth mode](docs/earth-mode.md) · [Demo script](docs/demo-script.md) · [Submission draft](docs/submission-draft.md)

---

Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA.
