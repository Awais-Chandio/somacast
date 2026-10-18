# Demo video script (3 minutes)

DRAFT. One continuous story: Kenji's body weather before, during and after a communication blackout, and what the flight surgeon sees when the link returns. Everything shown is simulated and fictional.

## Before you record

| Step | Detail |
| --- | --- |
| Phone | Sign in as `kenji@somacast.test` (C2, blackout decline scenario). The app opens in **LOS** on mission day 75. Tap **RESET DEMO** (works in LOS only): the panel reads "Outbox: 97 waiting (0 backlog + 97 log)", the whole mission so far, days 0 to 75. Then tap **−** 35 times to **day 40**. |
| Ground and wording | On the phone's link panel, choose the **Supabase** ground. Phone and console both in **Space** (each device now remembers the last choice, so check it). |
| Console | `npm run web`, sign in as `daniel@somacast.test`, open Kenji's crew page. Both phone and console in **Space** wording. |
| Blackout length | The handoff measures real time from the last time the link went down, or the app opened, to the AOS tap. The 1:25 beat restarts the app, which starts that clock again, so **wait at least 90 s of real time after the reopen** before the AOS tap (cut the wait in the edit). Dry run: about 100 s gave "Out of contact (LOS) for 2 min". |
| On screen | The **SIMULATED DATA** badge must be visible in every phone and console shot. Do not crop it out. |
| Captions | Burn in English captions of the voice-over. |
| Slides | Brand rules from `CLAUDE.md` section 4: Deep Blue or the brand gradient, Fira Sans Black H1 in caps, Overpass body, Neon Yellow as accent only. No NASA or Space Apps logo as ours, no award icons. |

## Timecode table

| Time | Screen | Action | Voice-over |
| --- | --- | --- | --- |
| 0:00–0:15 | Slide | Title: SOMACAST wordmark on the brand gradient, subtitle "Body weather for crews beyond Earth". | "On a deep-space mission, the doctor is on Earth, and the link is not always there. Messages take up to about 20 minutes each way, and near solar conjunction the link can be disrupted for two to three weeks." |
| 0:15–0:30 | Phone | Today, day 40: **Clear** (sun icon and the word). Point at the SIMULATED DATA badge. | "This is Kenji, a fictional crew member. Every number you see is simulated. Somacast learned his own normal from his first four weeks, and today he is Clear." |
| 0:30–0:45 | Phone | Zoom on the link panel: **Link: LOS**, "Outbox: 97 waiting (0 backlog + 97 log)". | "We are in loss of signal: no ground, no doctor. Somacast does not need them. Every day, alert and action goes into a black box on board." |
| 0:45–1:00 | Phone | Tap **+** 17 times to day 57 (jump cut over the taps). **Cloudy**. WHY: "Sleep duration is trending down and may pass the alert line within 72 h." ALERTS (0). The outbox stays at 97: the black box already holds every day up to day 75. | "Weeks later his sleep starts slipping. Not an alarm yet: Cloudy, with the reason. His sleep is trending down and may cross his own alert line within 72 hours." |
| 1:00–1:25 | Phone | Tap **+** 18 times to day 75 (jump cut). **Storm**. Scroll ALERTS (3), each MEDIUM and "3 days in a row": heart rate variability 43 ms (usual 52 ms, z -2.0), sleep duration 4.1 h (usual 5.5 h, z -2.6), cabin CO2 2.9 mmHg (usual 2.1 mmHg, z 2.4). Then ACTIONS (ILLUSTRATIVE): three "TODAY" actions, each "illustrative, expert review required". | "Day 75: Storm. Two of his own metrics have been past his line for three days in a row, and cabin CO2 is up for everyone. Each alert shows the value, his usual, the z-score and the days. The suggestions are simple, labelled illustrative, and never medication." |
| 1:25–1:50 | Phone | Kill and reopen the app (swipe it away in Recent apps, open it again). Still signed in, still **Link: LOS**, still day 75, and "Outbox: 97 waiting (0 backlog + 97 log)": the outbox count is unchanged. The reopen took about 14 s in the dev build; cut it. Then wait 90 s of real time before the next row. | "Even if the phone restarts, the black box keeps every entry. Nothing is lost." |
| 1:50–2:05 | Phone | Tap the link switch to **AOS**. "Outbox: 0 waiting" and the banner "Synced. Ground has 100 rows, 0 duplicates" (dry run; the row count grows by one handoff per rehearsal, the duplicates stay 0). Then the **HANDOFF SENT** card: "Kenji (C2), mission day 75: Storm forecast for the next 72 h. Top alert: Sleep duration 4.1 h is below the usual 5.5 h for 3 days in a row (z -2.6)." and "3 alerts attached as evidence. Ground review requested." | "Signal is back. The backlog syncs in batches. Every entry has its own key, so a resend is stored once: zero duplicates. Then Somacast sends one structured handoff." |
| 2:05–2:25 | Console | Kenji's crew page, **LATEST SBAR HANDOFF** with Storm: Situation, Background ("Out of contact (LOS) for 2 min, … The black box held 97 log entries and sent them at AOS."), Assessment, Recommendation. Click **SHOW ALERT** on one evidence item. | "On Earth, flight surgeon Daniel gets it in SBAR: situation, background, assessment, recommendation. It says how long Kenji was out of contact, and every claim links to its alert. Daniel decides, not the app." |
| 2:25–2:38 | Console, then phone | Daniel types a short note and taps **SEND**. On the phone, switch to LOS and back to AOS: FROM THE GROUND lists Daniel's new note with his name and the time. Notes from earlier rehearsals stay listed too (the Supabase log is append-only); the dry run already showed one from 2026-10-17. | "Daniel uplinks a note. At Kenji's next contact, it is on his phone, with who wrote it and when." |
| 2:38–2:50 | Phone, then console | Tap **Earth** in the phone's WORDING row and in the console header. Phone: "Body weather for teams far from a clinic", "Kenji, team C2", "Link: Back online" (it reads "Link: Offline" when the link is down), "Indoor CO2 partial pressure 2.9 mmHg is above the usual 2.1 mmHg". Same Storm, same numbers. | "The same engine fits teams on Earth, like a winter crew at an Antarctic research station. Earth mode changes the words, not the rules. We have not tested it there." |
| 2:50–3:00 | Slide | Honesty slide: "All vitals are simulated. Decision support, not a medical device. Thresholds are illustrative, expert review required." Footer: "Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA." | "All vitals here are simulated. Somacast is decision support, not a medical device: the doctor decides. Thresholds are illustrative and need expert review." |

LOS is on screen from 0:15 to 1:50 (95 s of video, more in real time).

## Dry run

Run on the Android emulator as Kenji on 2026-10-18, Space wording, Supabase ground, after RESET DEMO.

| Step | Expected | Seen | Match |
| --- | --- | --- | --- |
| Sign-in, reset | LOS, day 75 | LOS, day 75, "Outbox: 97 waiting (0 backlog + 97 log)" | Yes |
| Day 40 | Clear | Clear, "All metrics are close to this crew member's usual range." | Yes |
| Day 57 | Cloudy | Cloudy, sleep trending down, 0 alerts | Yes |
| Day 57 outbox | Count goes up | Stays at 97: days 0 to 75 are logged at sign-in | No, script changed |
| Day 75 | Storm, 3 alerts | Storm; HRV 43 / 52 (z -2.0), sleep 4.1 / 5.5 (z -2.6), CO2 2.9 / 2.1 (z 2.4); 3 TODAY actions | Yes |
| Kill and reopen | Outbox unchanged | Still signed in, LOS, day 75, 97 waiting | Yes |
| AOS | 0 duplicates, handoff sent | "Synced. Ground has 100 rows, 0 duplicates", HANDOFF SENT | Yes |
| Handoff blackout length | At least 90 s | "Out of contact (LOS) for 2 min" (read from Supabase as Daniel; measured from the reopen, not from the first LOS) | Yes, see the note on the blackout clock |
| From the ground | Only Daniel's new note | An earlier note (2026-10-17) is already listed | No, script changed |
| Earth wording | "Offline" | "Back online" while the link is up; "Offline" after a restart in LOS; kept after a restart | Yes, script changed |

The console rows (2:05 to 2:38) were not dry-run on screen; the handoff text was read from Supabase.

## Sources for spoken claims

| Claim | Source | Status |
| --- | --- | --- |
| Messages take up to about 20 minutes each way, and near solar conjunction the link can be disrupted for two to three weeks | McBrayer, K. T., Chai, P. R., and Judd, E. L., "Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions", NASA Langley Research Center, ASCEND 2022, NTRS 20220013418: https://ntrs.nasa.gov/citations/20220013418. The paper says the maximum one-way delay is "about 22 minutes for any mission and can range from 15 to 20 minutes while crew is at Mars", and that "all Mars missions will experience, a single, two-to-three-week disruption at some point in their duration". | Sourced |
| Kenji's values, days and states | Simulated: seed 42, blackout decline scenario, crew C2 (`packages/core`) | Simulated |
| Every rule and threshold | `packages/core/src/engine/thresholds.ts` | Illustrative, expert review required |

## Do not say

- That Somacast diagnoses, treats or predicts illness. It flags changes against a person's own baseline; the doctor decides.
- That any value is real astronaut data.
- That Earth mode has been used or tested at a real station, rig or clinic.

---

Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA.
