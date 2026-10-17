# Limitations

What Somacast does **not** do yet, and where its numbers come from. Read this before judging any result.

Somacast is decision support, not a medical device. It never diagnoses. The flight surgeon decides.

## Data

| Limitation | Detail |
| --- | --- |
| Simulated vitals | Every heart rate, HRV, sleep, exercise, CO2, radiation and check-in value is made by a seeded simulator (`packages/core/src/simulation`). Each reading carries `simulated: true`, and every screen that shows vitals says "Simulated data". Real astronaut HR and HRV are not public. |
| Partial calibration | Only sleep is calibrated to published ISS statistics (Barger et al. 2014), and cabin CO2 is kept inside the published ISS range. The other baselines are guesses. See [data-sources.md](data-sources.md). |
| NASA DONKI not yet used | A fetch script exists (`packages/core/scripts/fetch-donki.mjs`), but no DONKI data has been fetched into the repo. The solar storm scenario uses an illustrative spike on days 60 to 62, not a real event date. |
| Simulated crew | The four crew members (Maya, Kenji, Amara, Luis), the flight surgeon Daniel and every scenario are fictional. |

## Engine

| Limitation | Detail |
| --- | --- |
| Illustrative thresholds | z = 2 for 3 days, z = 3 for high severity, 14 learning days, a 28-day baseline window, at most 2 missing days in 7: all are illustrative, expert review required. None is a clinical limit. |
| No clinical validation | The engine has only been checked against its own simulator (false alarm rate, time to Storm; see [engine.md](engine.md)). It has never been tested on real people, real data or by clinicians. |
| Frozen baseline | The baseline is learned from the first 28 days and then frozen, so a slow decline cannot hide itself. There is no re-baselining: after a real, lasting change (for example after adaptation, illness or a new schedule) the baseline stays old. Re-baselining by the flight surgeon is future work. |
| First 14 days | The first days of a mission may not be a true "normal" because of adaptation. This is our reasoning, not a sourced fact. |
| Not modelled | Immune changes, bone loss and other effects of gravity. |
| No LLM | The optional LLM wording (REQ-020) is not built. All text comes from fixed rules. `ANTHROPIC_API_KEY` stays unset. |

## App and platform

| Limitation | Detail |
| --- | --- |
| Android only | The phone app has been built and run on Android. iOS is not built (no Xcode or Apple developer account yet); the code is React Native, so it is planned from the same source. |
| Not built | Psych check-in input on the phone (REQ-010), the "1 day = 5 s" demo speed control (REQ-016), a sparkline on the phone (REQ-011), a cap on alerts per day (REQ-013 caps actions, not alerts). See [verification.md](verification.md). |
| Earth mode is wording only | Engine sentences keep the Space wording and all metrics stay. See [earth-mode.md](earth-mode.md). |
| Device outbox | The phone outbox removes an entry once the ground acknowledges it. The append-only copy is the ground log (Supabase refuses update and delete). |

## Security and demo accounts

| Limitation | Detail |
| --- | --- |
| Demo passwords | The four demo accounts (`maya`, `kenji`, `daniel`, `probe` at `somacast.test`) use simple demo passwords, kept only in `scripts/.env` (git-ignored) and typed on the sign-in screen. They protect demo data only. If they are shared with judges, rotate them after the event. |
| Free tier | Supabase runs on the free tier. A paused or deleted project stops sync; the phone still works offline. |
| No real health data | No real person or real health data is stored anywhere. Do not enter any. |

---

Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA.
