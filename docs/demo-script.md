# Demo video script (3 minutes)

DRAFT. One continuous story: Kenji's body weather before, during and after a communication blackout, and what the flight surgeon sees when the link returns. Everything shown is simulated and fictional.

## Before you record

| Step | Detail |
| --- | --- |
| Phone | Sign in as `kenji@somacast.test` (C2, blackout decline scenario). The app opens in **LOS** and on mission day 75. Tap **−** back to **day 40** before recording. The LOS clock started when the app opened; do not switch the link until the AOS row below. |
| Ground | On the phone's link panel, choose the **Supabase** ground. |
| Console | `npm run web`, sign in as `daniel@somacast.test`, open Kenji's crew page. Both phone and console in **Space** wording. |
| Blackout length | The handoff measures real time from LOS to AOS. Keep the phone in LOS for **at least 90 s of real time** before the AOS tap, so the Background line shows a real blackout length (90 s reads "2 min"). The jump cuts in the edit make the real time longer than the video time, which is fine. |
| On screen | The **SIMULATED DATA** badge must be visible in every phone and console shot. Do not crop it out. |
| Captions | Burn in English captions of the voice-over. |
| Slides | Brand rules from `CLAUDE.md` section 4: Deep Blue or the brand gradient, Fira Sans Black H1 in caps, Overpass body, Neon Yellow as accent only. No NASA or Space Apps logo as ours, no award icons. |

## Timecode table

| Time | Screen | Action | Voice-over |
| --- | --- | --- | --- |
| 0:00–0:15 | Slide | Title: SOMACAST wordmark on the brand gradient, subtitle "Body weather for crews beyond Earth". | "On a deep-space mission, the doctor is on Earth, and the link is not always there. Messages take minutes each way, and during a solar conjunction the link can be gone for about two weeks." |
| 0:15–0:30 | Phone | Today, day 40: **Clear** (sun icon and the word). Point at the SIMULATED DATA badge. | "This is Kenji, a fictional crew member. Every number you see is simulated. Somacast learned his own normal from his first four weeks, and today he is Clear." |
| 0:30–0:45 | Phone | Zoom on the link panel: **LOS**, no signal, "Outbox: … waiting". | "We are in loss of signal: no ground, no doctor. Somacast does not need them. Every day, alert and action goes into a black box on board." |
| 0:45–1:00 | Phone | Tap **+** to day 57 (jump cut over the taps). **Cloudy**. WHY: "Sleep duration is trending down and may pass the alert line within 72 h." The outbox count is higher. | "Weeks later his sleep starts slipping. Not an alarm yet: Cloudy, with the reason. His sleep is trending down and may cross his own alert line within 72 hours." |
| 1:00–1:25 | Phone | Tap **+** to day 75 (jump cut). **Storm**. Scroll the alert cards: HRV 43 ms (usual 52), sleep 4.1 h (usual 5.5), cabin CO2 2.9 mmHg (usual 2.1), each "3 days in a row" with its z. Then the coach actions with "illustrative, expert review required". | "Day 75: Storm. Two of his own metrics have been past his line for three days in a row, and cabin CO2 is up for everyone. Each alert shows the value, his usual, the z-score and the days. The suggestions are simple, labelled illustrative, and never medication." |
| 1:25–1:50 | Phone | Hold on the link panel: still **LOS**, the outbox count, no ground. Check that at least 90 s of real time have passed since the app opened. | "Still no link. Nothing is lost, and nothing waits for the ground: the forecast, the alerts and the log all run on the phone. The black box keeps every entry until contact returns." |
| 1:50–2:05 | Phone | Tap the link switch to **AOS**. Banner: "Synced. Ground has … rows, 0 duplicates." Then the **HANDOFF SENT** card. | "Signal is back. The backlog syncs in batches. Every entry has its own key, so a resend is stored once: zero duplicates. Then Somacast sends one structured handoff." |
| 2:05–2:25 | Console | Kenji's crew page, **LATEST SBAR HANDOFF** with Storm: Situation, Background ("Out of contact (LOS) for … min"), Assessment, Recommendation. Click **SHOW ALERT** on one evidence item. | "On Earth, flight surgeon Daniel gets it in SBAR: situation, background, assessment, recommendation. It says how long Kenji was out of contact, and every claim links to its alert. Daniel decides, not the app." |
| 2:25–2:38 | Console, then phone | Daniel types a short note and taps **SEND**. On the phone, switch to LOS and back to AOS: **FROM THE GROUND (1)** shows Daniel's note with his name and the time. | "Daniel uplinks a note. At Kenji's next contact, it is on his phone, with who wrote it and when." |
| 2:38–2:50 | Phone, then console | Tap **Earth** in the phone's WORDING row and in the console header: LOS becomes "Offline", flight surgeon becomes "remote doctor", cabin CO2 becomes "Indoor CO2". Same Storm, same numbers. | "The same engine fits teams on Earth, like a winter crew at an Antarctic research station. Earth mode changes the words, not the rules. We have not tested it there." |
| 2:50–3:00 | Slide | Honesty slide: "All vitals are simulated. Decision support, not a medical device. Thresholds are illustrative, expert review required." Footer: "Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA." | "All vitals here are simulated. Somacast is decision support, not a medical device: the doctor decides. Thresholds are illustrative and need expert review." |

LOS is on screen from 0:15 to 1:50 (95 s of video, more in real time).

## Sources for spoken claims

| Claim | Source | Status |
| --- | --- | --- |
| A solar conjunction cuts the Mars link for about two weeks | Space.com, Mars communications blackout (2015): https://space.com/29576-nasa-mars-spacecraft-radio-blackout.html (also in [conops.md](conops.md)) | Sourced |
| Messages take minutes each way | Not yet sourced in this repo. Confirm with a NASA page before recording, or cut the sentence. | To confirm |
| Kenji's values, days and states | Simulated: seed 42, blackout decline scenario, crew C2 (`packages/core`) | Simulated |
| Every rule and threshold | `packages/core/src/engine/thresholds.ts` | Illustrative, expert review required |

## Do not say

- That Somacast diagnoses, treats or predicts illness. It flags changes against a person's own baseline; the doctor decides.
- That any value is real astronaut data.
- That Earth mode has been used or tested at a real station, rig or clinic.

---

Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA.
