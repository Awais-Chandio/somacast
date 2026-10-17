# Somacast ConOps (Phase 0)

**Mission:** Help an astronaut see "my normal vs today" for their own body, forecast the next 72 hours as Clear, Cloudy or Storm, keep a black-box log during a communication blackout, and hand a structured summary to the flight surgeon when the link returns.

**Setting:** Deep-space, long-duration mission (Artemis or Mars class). Not low Earth orbit: the ISS has near-continuous contact through relay satellites, so multi-day blackouts are not an ISS problem.

## Glossary

| Term | Meaning |
|---|---|
| CMO | Crew Medical Officer: an astronaut trained to run medical tests and treat with onboard supplies, following the flight surgeon's guidance (JAXA) |
| Flight surgeon | Doctor in Mission Control Houston who advises on crew health remotely |
| BME | Biomedical Engineer: call sign of the Biomedical Flight Controllers; handles uplink and downlink for crew health systems (NASA) |
| CHeCS | Crew Health Care System: onboard medical hardware (HMS, EHS, CMS) |
| LOS / AOS | Loss / Acquisition of Signal: the link to ground drops or returns |
| Baseline | A person's own normal range for a metric (our term) |
| z-score | How many standard deviations today is from your own average |
| EWMA | Smoothed average that weights recent days more |
| SBAR | Situation, Background, Assessment, Recommendation: a structured handoff format. Our design choice, not claimed as NASA's |
| Analog mission | Practice mission in an extreme place on Earth (HERA, NEEMO) |

## Personas (fictional)

| | Maya, crew member and CMO | Dr. Daniel, flight surgeon, Houston (secondary) |
|---|---|---|
| Needs | 1. See today vs her own normal at a glance. 2. Works fully offline. 3. Know why an alert fired. | 1. Crew list with weather status. 2. Structured handoff after a blackout. 3. Send advice back. |
| Pain points | 1. Alarm fatigue. 2. Very little free time (guess: daily check-in must take under 1 minute). 3. No one to ask during a blackout. | 1. Gaps during LOS. 2. Free-text noise. 3. Cannot tell how a conclusion was reached. |

Every astronaut has their own profile and baseline. The ground console is optional.

## Scenarios

```
S1 Normal day        S2 Blackout (LOS)                 S3 Link returns (AOS)
-------------        -----------------                 ---------------------
LINK_UP              LINK LOST (days; demo: 3+ days)   LINK_UP
Clear                sleep drops for 3 nights          outbox syncs, no duplicates
"you vs normal"      cabin CO2 rises                   SBAR handoff -> Dr. Daniel
baseline learned     Cloudy -> Storm (next 72 h)       his note -> shown to Maya
over first 14 days   black box keeps logging           on the next link
```

Real analogy: during a Mars solar conjunction (about 2 weeks, roughly every 26 months) orbiters stored data on board and sent it after contact resumed. The black box and outbox work the same way.

## Assumptions and limits
1. All vitals are simulated and labelled as simulated.
2. Decision support, not a medical device. The flight surgeon decides. The app never diagnoses.
3. Thresholds (2 SD, "persist N days") are illustrative, expert review required.
4. Real data used: published ISS sleep statistics (Barger et al. 2014) and NASA DONKI space weather.
5. Not modelled: immune changes, bone loss, gravity effects.
6. The first 14 flight days may not be a true "normal" because of adaptation. This is our reasoning, not a sourced fact. Test it in the backtest; consider an optional pre-flight baseline.
7. Blackout length in the demo (3+ days) is a choice. How often the crew opens the app is a guess.

## Sources
- NASA, Biomedical Flight Controllers: https://www.nasa.gov/directorates/esdmd/hhp/biomedical-flight-controllers/
- JAXA, ISS medical operations: https://humans-in-space.jaxa.jp/en/biz-lab/med-in-space/healthcare/medops/system
- Space Apps 2026 Challenge #5: https://www.spaceappschallenge.org/2026/challenges/create-health-monitoring-software-for-astronauts-on-space-missions/
- Space.com, Mars communications blackout (2015): https://space.com/29576-nasa-mars-spacecraft-radio-blackout.html
- R&D World, TDRS continuous communications: https://www.rdworldonline.com/tdrs-an-era-of-continuous-space-communications/
