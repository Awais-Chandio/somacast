# Data sources and honesty notes

Somacast uses **simulated** crew vitals. Real daily astronaut heart rate and HRV are not public, so every reading carries `simulated: true` and the app labels it as simulated.

| Item | Value | Status | Source |
| --- | --- | --- | --- |
| Sleep mean | 6.09 h | Published | Barger et al. 2014, ISS crews ([ScienceDaily summary](https://www.sciencedaily.com/releases/2014/08/140807215803.htm)) |
| Nights under 6 h | 1,294 of 2,951 (about 44%) | Published | Barger et al. 2014 ([SpaceDaily](https://www.spacedaily.com)) |
| Sleep spread in simulator | between-person 0.3 h, within-person 0.5 h | Our tuning | Chosen so about 44% of simulated nights are under 6 h |
| Cabin CO2 limit | 24 h average at or below 3 mmHg; 7-day ISS average ranged 1 to 9 mmHg | Published | [NASA OCHMO technical brief](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf) |
| Cabin CO2 baseline in simulator | 2.0 mmHg | Guess | Inside the published range, not a measurement |
| Resting HR, HRV, exercise minutes, radiation baseline, psych check-in | see `src/metrics.ts` | Guess | Illustrative, expert review required |
| Solar particle events | real event dates | Published | NASA DONKI SEP, fetched by `scripts/fetch-donki.mjs` |

Somacast is decision support, not a medical device. Thresholds are illustrative and need expert review.
