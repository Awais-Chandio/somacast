# Verification matrix (Phase 11)

One row per requirement in [requirements.md](requirements.md). Checked on 2026-10-17 against commit "feat: Earth mode copy; docs: verification matrix and limitations".

**Status**

- **Pass**: an automated test or the RLS check covers the whole requirement and passes, or (for Inspection items) the code was inspected for this matrix.
- **Partial**: part of it is covered, or part of it is only shown by a manual demo step that is not recorded in the repo.
- **Not done**: not built.

**Where tests live** (test names are quoted exactly)

| Short name | File |
| --- | --- |
| engine | `packages/core/src/engine/engine.test.ts` |
| simulator | `packages/core/src/simulation/simulator.test.ts` |
| schemas | `packages/core/src/domain/schemas.test.ts` |
| outbox | `packages/core/src/sync/outbox.test.ts` |
| coach | `packages/core/src/coach/coach.test.ts` |
| sbar | `packages/core/src/coach/handoff.test.ts` |
| copy | `packages/core/src/copy/copy.test.ts` |
| tokens | `packages/core/src/design/tokens.test.ts` |
| app | `apps/mobile/__tests__/App.test.tsx` |
| auth | `apps/mobile/src/features/auth/controller/useAuth.test.tsx` |
| account | `apps/mobile/src/features/auth/model/account.test.ts` |
| today | `apps/mobile/src/features/today/model/todayModel.test.ts` |
| todayCtl | `apps/mobile/src/features/today/controller/useTodayController.test.tsx` |
| forecastCard | `apps/mobile/src/features/today/view/ForecastCard.test.tsx` |
| chip | `apps/mobile/src/shared/components/Chip.test.tsx` |
| sqlite | `apps/mobile/src/sync/SqliteOutboxStore.test.ts` |
| blackBox | `apps/mobile/src/sync/blackBox.test.ts` |
| linkPanel | `apps/mobile/src/features/link/model/linkPanel.test.ts` |
| linkCtl | `apps/mobile/src/features/link/controller/useLinkPanel.test.tsx` |
| handoff | `apps/mobile/src/features/ground/model/handoff.test.ts` |
| notes | `apps/mobile/src/features/ground/controller/useGroundNotes.test.tsx` |
| ground | `apps/web/src/data/ground.test.ts` |
| rls | `scripts/rls-check.mjs` (`npm run rls-check`, live Supabase, rows quoted as WHO / CHECK) |

## Must

| ID | Requirement (short) | How it is verified | Status |
| --- | --- | --- | --- |
| REQ-001 | Separate baseline per crew member | engine › "REQ-001: each crew member's baseline comes only from their own readings"; engine › "learns a personal sleep baseline close to the simulated person" | Pass |
| REQ-002 | "Learning" state until 14 days | engine › "gives no alerts while still learning (under 14 days)"; engine › "low confidence with under 14 days of data or too many missing days"; today › "day 5: low confidence while the baseline is still learning"; ground › "early in the mission: fewer points and no usual value while still learning" | Partial: the engine and the console ("still learning") do it, but the phone only says "Low confidence: not enough recent data to trust the baseline", never "learning" |
| REQ-003 | Flag at z > 2 for 3 days in a row, both configurable | engine › "REQ-003: alerts after exactly 3 bad days in a row, and both thresholds are configurable" | Pass. This test found that the `Thresholds` type only accepted the default values; fixed in this commit |
| REQ-004 | Every alert carries {metric, value, baseline, zscore, days, reason} | engine › "every alert is valid and explains itself"; simulator › "rejects an alert without a reason"; today › "blackout decline: Storm for C2 around day 75, alerts are fully worded"; Inspection: `AlertCard.tsx` (phone) and `CrewDetail.tsx` (console) show value, usual, z, days and reason | Pass |
| REQ-005 | 72 h Clear / Cloudy / Storm; low confidence under 14 days or > 2 of last 7 missing | engine › "normal days: under 3% of crew-days are not Clear, and never Storm (15 seeds)"; "blackout: C2 reaches Storm after the decline starts (day 45) in all 10 seeds, and C1 never does"; "blackout: C2 is Storm at the end of the decline (day 75) in at least 45 of 50 seeds"; "shared cabin CO2 problem makes healthy crew Cloudy, not Storm"; "low confidence with under 14 days of data or too many missing days"; "forecast is valid, 72 h, same input gives same output". Analysis: [engine.md](engine.md) | Pass |
| REQ-006 | All Must functions with the network disabled | app › "starts on sign-in; offline demo opens Today on the demo ground" (Jest has no `.env`, so no backend at all); auth › "without a backend: signed out, and offline demo is available". Manual demo: phone in airplane mode → Continue offline → step days, switch scenario, LOS/AOS on the demo ground; forecast, alerts, black box and handoff all work. Recorded 2026-10-18 on the Android emulator (Pixel 7 Pro, API 36) in real airplane mode (`adb shell cmd connectivity airplane-mode enable`, ping "Network is unreachable"), Kenji signed in before the blackout: day 44 Clear → day 57 Cloudy → day 64 Storm with 2 alerts, each with value, usual, z and days; outbox 97 → 102 waiting as days 76 to 80 were logged; AOS still in airplane mode → "Sync paused after repeated errors … 102 still waiting"; airplane mode off, AOS → "Synced. Ground has 107 rows, 0 duplicates", 0 waiting. Screenshots: [docs/screenshots/phase-5-airplane/](screenshots/phase-5-airplane/) | Partial: emulator, not a real phone. Reopening the app in airplane mode signs a crew member out ("Could not load your profile: Network request failed"), because the profile is fetched on every start; only Continue offline (demo ground) is left |
| REQ-007 | Append-only black-box log that survives restart | sqlite › "restart: a new store on the same file still has the backlog"; sqlite › "synced keys survive a restart and are never queued again; plain markSent forgets them"; sqlite › "LOS clock: survives a restart, null clears it, each account has its own"; linkCtl › "LOS, restart, AOS: the handoff counts the blackout from the real LOS start"; linkCtl › "after a sync to Supabase and a restart, the requeued history leaves 0 waiting"; sqlite › "add is INSERT OR IGNORE: the same key twice keeps one row"; blackBox › "one reading plus one entry per alert, all valid log entries"; blackBox › "record: count = days + 1 readings (plus alerts); a rerun adds 0"; todayCtl › "black box: each shown day is logged once, revisiting adds nothing"; rls › Probe / "update own row is refused", Probe / "delete own row is refused" | Partial: restart is tested on Node's SQLite, not a killed app on a device; the phone outbox deletes entries once acked (the append-only copy is the ground log); crew actions are only the SBAR handoff, since check-ins (REQ-010) are not built |
| REQ-008 | 5,000 queued items sync to exactly 5,000 rows, no duplicate keys | outbox › "REQ-008: 5,000-item backlog syncs with exactly 5,000 rows, no duplicates, despite lost batches and lost acks"; sqlite › "REQ-008 on SQLite: 5,000 items sync to exactly 5,000 ground rows despite lost batches and acks"; linkPanel › "5,000 backlog + 1 log syncs in batches of 200 with 0 duplicates, progress only goes up"; linkCtl › "LOS: fill backlog -> 5,000 waiting; AOS: syncs to 5,000 ground rows"; rls › Probe / "resending a stored key adds no row". Manual demo: LOS → FILL 5,000-ITEM BACKLOG → AOS on Supabase → banner "Synced. Ground has … rows, 0 duplicates" | Pass |
| REQ-009 | SBAR handoff from active alerts, with evidence links | sbar › all 10 tests, e.g. "evidence = the alert ids; disclaimer is fixed", "Assessment: every alert reason"; handoff › "carries a full SBAR handoff that matches HandoffSchema"; linkCtl › "sends the backlog, then the handoff in the same AOS, and reports the contact"; ground › "evidence links to the alerts on the page, in the handoff order" | Pass |

## Should

| ID | Requirement (short) | How it is verified | Status |
| --- | --- | --- | --- |
| REQ-010 | Psych check-in (1 to 5, optional note) in under 1 minute | None. `psychCheckin` exists only as a simulated metric; there is no input screen | Not done |
| REQ-011 | 14-day sparkline with baseline band per metric | ground › "14 days per metric ending at the newest day, null where nothing arrived"; Inspection: `apps/web/src/features/crew/Sparkline.tsx` | Partial: console only; the baseline is a dashed "usual" line, not a band; no sparkline on the phone |
| REQ-012 | Actions from JSON rules with a rationale, labelled illustrative | coach › "sleep low: protect the next sleep window, naming the sleep alert"; "Kenji (C2), blackout decline, day 75: 1 to 3 actions, all traced to real alerts"; "no rule text, for any metric, severity or forecast, mentions a medication or a dose"; sbar › "Recommendation: coach actions, labelled, then ground review" | Partial: rules are a TypeScript table (`coachRules`), not a JSON file; the rationale is the alert each action names |
| REQ-013 | Cap alerts at N per day, ordered by severity | coach › "at most 3 actions, most urgent alert first, each naming its alert" | Partial: actions are capped at 3 and ranked by severity; the alert list itself is not capped |
| REQ-014 | Same seed, same data (4 crew, 90 days, 3 scenarios) | simulator › "same seed gives identical data"; "different seed gives different data"; "makes 4 crew x 90 days of valid, simulated-labelled readings"; "scenario only changes what it names (same random draws)" | Pass |
| REQ-015 | Sleep calibrated to ISS statistics; NASA DONKI for radiation; sources cited | simulator › "sleep matches the ISS calibration: mean near 6.09 h, about 44% of nights under 6 h"; simulator › "cabin CO2 stays inside the published 1 to 9 mmHg range in normal days"; Inspection: [data-sources.md](data-sources.md) | Partial: DONKI not fetched or used; the solar storm is an illustrative spike |
| REQ-016 | Demo speed control ("1 day = 5 s") | None. The phone has a manual day stepper (− / +) only | Not done |

## Could

| ID | Requirement (short) | How it is verified | Status |
| --- | --- | --- | --- |
| REQ-017 | Web console with crew status and a handoff inbox | ground › "one card per crew, counts every row, keeps the newest arrival, hides ZZ- crews"; "matches core assess() on the original simulation, as of the newest synced day"; "reads the handoff the phone sent". Manual demo: `npm run web`, sign in as Daniel, overview cards, open Kenji | Partial: the console shows the latest handoff per crew; there is no inbox list across crews |
| REQ-018 | Surgeon's uplink note reaches the device at the next link | notes › "AOS on Supabase: fetches and shows each note with author and time"; "every new AOS fetches again"; "a failed fetch keeps the notes already shown and says why"; rls › Daniel / "insert uplink note for ZZ-TEST", Probe / "reads the uplink note for its crew", Maya / "reads no ZZ-TEST uplink notes" | Pass |
| REQ-019 | Earth (remote clinic) profile by config only | copy › all 6 tests, including "both modes have exactly the same keys" and "Earth wording has no space jargon"; app › "Earth wording: Offline / team member / indoor CO2, same forecast"; today › "Earth wording: indoor CO2, \"Day\", Earth coach text; same state and numbers"; account › "Earth wording: team and remote doctor"; engineText › "same alert, Space vs Earth: only the words change", "Space wording of every alert and forecast is exactly the stored text", "Earth: offline wording, indoor CO2, remote doctor, no space jargon"; handoff › "card view in Earth wording"; ground › "evidence in Earth wording"; copy provider › "next start: opens in the saved mode"; mode storage › "blocked or missing storage never throws". See [earth-mode.md](earth-mode.md) | Partial: words only (engine sentences are re-worded on screen; the stored log stays in Space wording); same metrics and thresholds |
| REQ-020 | Optional LLM wording that never changes severity (default off) | None. No LLM code exists; `ANTHROPIC_API_KEY` is unset | Not done (by choice) |

## Non-functional

| ID | Requirement (short) | How it is verified | Status |
| --- | --- | --- | --- |
| NFR-001 | "Simulated data" on every vitals screen; rules labelled illustrative; handoff says "decision support, not a medical device" | app › "starts on sign-in; offline demo opens Today on the demo ground" (checks "SIMULATED DATA"); simulator › "rejects a reading that is not marked simulated"; sbar › "evidence = the alert ids; disclaimer is fixed"; sbar › "Recommendation: coach actions, labelled, then ground review". Inspection: `SimulatedBadge` in `TodayHeader.tsx`, "SIMULATED DATA" badge in the console `Shell.tsx` on every page | Pass |
| NFR-002 | No alert or forecast without a reason | engine › "NFR-002: every forecast, on every day of every scenario, gives at least one reason"; simulator › "rejects an alert without a reason" | Pass |
| NFR-003 | No row lost or duplicated across app kill, wrong clock, NaN or negative input | sqlite › "restart: a new store on the same file still has the backlog"; sqlite › "batch rolls back every write when one fails"; outbox › "NFR-003 wrong clock: order and de-duplication never depend on the timestamp"; schemas › "ReadingSchema: NaN, infinite and negative input" (9 tests); ground › "skips the demo backlog, malformed payloads and rows that claim another crew"; blackBox › "recorded again after a sync: the ground still stores each entry once" | Partial: an app killed mid-sync on a real device is not tested. The schema test found that negative heart rate and HRV were accepted; fixed in this commit |
| NFR-004 | Dark theme, contrast 4.5:1, status never by colour alone, touch targets 48 px | tokens › "%s is at least 4.5:1" (each approved pair), "the theme text and bg pair passes"; forecastCard › "%s: line icon at 32 with the shared stroke, plus the word" (clear, cloudy, storm), "low confidence: AlertTriangle line icon plus the words, no emoji"; chip › "selected: Check line icon at 16 plus the plain label". Inspection: `size.minTouch` = 48 on Chip, StepButton, link panel buttons; console buttons use `--touch` (48 px) | Pass |
| NFR-005 | One crew member can never read another's data (server side) | rls › all 17 rows, e.g. Maya / "read ZZ-TEST rows returns 0", Maya / "profiles shows only her own row", Maya / "insert ZZ-TEST row is refused", anon / "logged-out read of log_entries gets nothing". 17/17 PASS on 2026-10-17 | Pass |
| NFR-006 | Cost stays $0; a fresh clone runs in 3 commands | Inspection: Supabase free tier, no paid API, no LLM key; README "How to verify". Fresh clone on 2026-10-18 (`git clone` into `/tmp/somacast-fresh`, README quick start only): installs, `npm test` (89 + 119 + 25 pass), `npm start` + `npm run android` (sign-in screen with Continue offline, no `.env`) and `npm run web` all worked; `npm run rls-check` failed with `ERR_MODULE_NOT_FOUND` because the README skipped the root `npm ci` (fixed in the README) | Partial: tried on the development Mac, not a clean machine; install is 4 commands (root, core, mobile, web), not 3 |

## Totals on 2026-10-18

| Suite | Command | Result |
| --- | --- | --- |
| Core (Jest) | `npm run test:core` | 9 suites, 89 tests passed |
| Mobile (Jest) | `npm run test:mobile` | 16 suites, 119 tests passed |
| Web (Vitest) | `npm run test:web` | 2 files, 25 tests passed |
| RLS (live Supabase) | `npm run rls-check` | 17/17 PASS |

Requirements: 12 Pass, 11 Partial, 3 Not done, out of 26 (20 REQ + 6 NFR).

## Known gaps (each more than about 30 minutes)

1. **REQ-010** psych check-in screen on the phone, written to the black box as a `crew_action`.
2. **REQ-016** demo speed control (auto-advance one day every 5 s).
3. **REQ-011** sparkline on the phone, and a baseline band (mean ± z line) instead of a single "usual" line.
4. **REQ-013** a daily cap on shown alerts (actions are already capped).
5. **REQ-017** a handoff inbox listing every handoff across crews.
6. **REQ-015** fetch real DONKI SEP events and date the solar storm scenario from one.
7. **REQ-002** show the word "learning" on the phone while the baseline is still learning.
8. **REQ-006 / REQ-007 / NFR-003** repeat the airplane-mode run (done on the emulator) and a force-quit during sync on a real Android phone (manual, screenshots in `docs/screenshots/`).
9. **REQ-019** an Earth profile with its own metrics and thresholds, chosen with clinical experts.
10. **NFR-006** a fresh-clone check (clone, install, test) on a clean machine or CI (done on the development Mac only).
11. **CI** runs only the core suite; mobile and web tests run locally.
12. **REQ-006** keep a signed-in crew member signed in when the app reopens during LOS (cache the profile on the phone instead of fetching it on every start).
