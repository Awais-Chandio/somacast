# Data sources and honesty notes

Somacast uses **simulated** crew vitals. Real daily astronaut heart rate and HRV are not public, so every reading carries `source: 'simulated'` and the app labels it as simulated. The optional CSV import reads a bundled example file with made-up values; those readings carry `source: 'imported'` and the badge says "IMPORTED DATA (example file)" (see [real-mission.md](real-mission.md)).

| Item | Value | Status | Source |
| --- | --- | --- | --- |
| Sleep mean | 6.09 h | Published | Barger et al. 2014, ISS crews ([ScienceDaily summary](https://www.sciencedaily.com/releases/2014/08/140807215803.htm)) |
| Nights under 6 h | 1,294 of 2,951 (about 44%) | Published | Barger et al. 2014 ([SpaceDaily](https://www.spacedaily.com)) |
| Sleep spread in simulator | between-person 0.3 h, within-person 0.5 h | Our tuning | Chosen so about 44% of simulated nights are under 6 h |
| Cabin CO2 limit | 24 h average at or below 3 mmHg; 7-day ISS average ranged 1 to 9 mmHg | Published | [NASA OCHMO technical brief](https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf) |
| Cabin CO2 baseline in simulator | 2.0 mmHg | Guess | Inside the published range, not a measurement |
| Resting HR, HRV, exercise minutes, radiation baseline, psych check-in | see `packages/core/src/domain/metrics.ts` | Guess | Illustrative, expert review required |
| Solar particle events | illustrative spike on days 60 to 62 | Not yet sourced | NASA DONKI SEP is planned: `packages/core/scripts/fetch-donki.mjs` exists, but no DONKI data has been fetched or used yet |

## NASA OSDR (context, not used as input)

NASA's Open Science Data Repository (OSDR) hosts datasets from the Inspiration4 mission (source: https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/):

| Dataset | Sample type |
| --- | --- |
| OSD-569 | Whole blood |
| OSD-570 | PBMCs |
| OSD-571 | Plasma |
| OSD-575 | Serum |
| OSD-572 | Skin, oral and nasal swabs |
| OSD-573 | Dragon capsule swabs |
| OSD-574 | Skin biopsies |
| OSD-630 | Stool |
| OSD-656 | Urine |
| OSD-687 | T-cells |

Related: the Space Omics and Medical Atlas (SOMA) publication package (source: https://www.nasa.gov/osdr-latest-news-soma-publications).

These are lab and omics datasets, not daily vitals, so Somacast does not ingest them. They inform the Gap rows (immune, bone) in [nasa-risk-map.md](nasa-risk-map.md) and future work.

Somacast is decision support, not a medical device. Thresholds are illustrative and need expert review.
