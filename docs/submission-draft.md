# Submission draft

> **DRAFT: re-check against the official challenge statement (28 Oct) and the submission guide (13 Nov).** Check the rules on pre-built code and on AI-tool disclosure before submitting.

## Project name

Somacast

## One-line pitch

Body weather for crews beyond Earth: Somacast learns each crew member's own normal, forecasts the next 72 hours as Clear, Cloudy or Storm, and keeps working when the link to Earth is gone.

## Summary

On a deep-space mission the flight surgeon is on Earth and the link can drop for days. Somacast runs on the crew's phone without a network. It learns each crew member's own baseline for sleep, heart rate, HRV, exercise, mood, cabin CO2 and radiation, flags changes that persist, and forecasts the next 72 hours as Clear, Cloudy or Storm, always with the reason. During a blackout a black-box log keeps every entry. When the link returns, the backlog syncs with zero duplicates and the flight surgeon gets an SBAR handoff with evidence, then can send a note back. An Earth mode rewords the same engine for remote teams on Earth. All vitals are simulated. Somacast is decision support, not a medical device.

## How it addresses the challenge

| Need | What Somacast does |
| --- | --- |
| Monitor crew health | A personal baseline per crew member and metric; an alert when a metric stays past z = 2 for 3 days in a row (illustrative thresholds). |
| See problems coming | A 72-hour forecast (Clear, Cloudy, Storm) from active alerts and short-term trends, marked "low confidence" when data is thin. |
| Work without Earth | The engine, forecast, black box and handoff all run on the phone with no backend (tested; an airplane-mode run on a real phone is not yet recorded). A SQLite black box keeps readings, alerts and actions during loss of signal. |
| Hand off to the ground | At acquisition of signal the backlog syncs in batches with idempotency keys (a 5,000-item backlog test lands with no duplicates), and an SBAR handoff with evidence goes to the flight surgeon's console. |
| Explain every alert | Each alert carries metric, value, usual value, z-score, days and a plain-English reason. No black box in the logic. |
| Keep the doctor in charge | Suggestions are behaviour and scheduling only, never medication, and labelled "illustrative, expert review required". The flight surgeon decides and can uplink a note. |
| Reach beyond space | Earth mode rewords the same engine for teams far from a clinic (for example a winter Antarctic station). Not tested in any real setting. |

## Tools and technology

| Part | Technology |
| --- | --- |
| Shared engine | TypeScript, Zod schemas, Jest (`packages/core`, no network, no LLM) |
| Phone app | React Native 0.88 (Android), op-sqlite (black-box outbox), AsyncStorage, react-native-svg, Lucide icons |
| Ground console | React 19, Vite, Vitest, Lucide icons |
| Backend | Supabase free tier: Postgres with an append-only log, Auth, row-level security (roles `crew` and `flight_surgeon`) |
| Quality | GitHub Actions CI (core format, type check, tests), Prettier, a live RLS check script (17 checks) |
| Design | NASA Space Apps brand palette; Fira Sans, Overpass and Fira Code (SIL Open Font License) |

Cost: $0 (free tiers, no paid APIs).

## Data used

| Data | Use | Status |
| --- | --- | --- |
| Crew vitals (heart rate, HRV, sleep, exercise, CO2, radiation, psych check-in) | All demo data, from a seeded simulator | **Simulated.** Real astronaut HR and HRV are not public. Every reading is marked `simulated: true`, and every screen says "Simulated data". |
| ISS sleep statistics (mean 6.09 h; 1,294 of 2,951 nights under 6 h) | Calibrates the simulated sleep | Published: Barger et al. 2014 |
| Cabin CO2 limit and ISS range (24 h average at or below 3 mmHg; 7-day average 1 to 9 mmHg) | Keeps simulated CO2 inside the published range | Published: NASA OCHMO technical brief OCHMO-TB-004 |
| Other baselines (resting HR, HRV, exercise, radiation, check-in) | Simulator settings | Guesses, illustrative, expert review required |
| NASA DONKI space-weather events | Planned for the solar storm scenario | **Not used yet.** The storm is an illustrative spike. |

Crew members (Maya, Kenji, Amara, Luis) and the flight surgeon (Daniel) are fictional. Full list with links: [data-sources.md](data-sources.md).

## AI tools used

- **Claude (Anthropic), through Claude Code**, helped write code and documentation, including this draft. Awais reviewed, ran and tested everything.
- Somacast itself uses no AI at runtime. All alerts, forecasts, suggestions and handoffs come from fixed rules; no LLM decides severity or writes clinical text.
- To confirm before submitting: whether any AI-generated images, video or voice are used in the video or slides, and disclose them if so.

## Known limitations

- All vitals are simulated; the engine has only been checked against its own simulator, never on real people or by clinicians.
- Thresholds are illustrative and need expert review. The baseline is frozen after 28 days, with no re-baselining yet.
- NASA DONKI data is not used yet.
- Android only; iOS is not built.
- Not built: psych check-in input on the phone, a demo speed control, a sparkline on the phone, a cross-crew handoff inbox.
- Earth mode changes words only; it keeps the same metrics and thresholds.

Full list: [limitations.md](limitations.md). Requirement-by-requirement status: [verification.md](verification.md).

## Team and links

- Team: Muhammad Awais (solo).
- Code: https://github.com/Awais-Chandio/somacast
- Video: to add.

---

Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA.
