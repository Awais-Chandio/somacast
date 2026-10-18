# How Somacast maps to NASA's human spaceflight hazards and risks

NASA's Human Research Program groups the dangers of human spaceflight into five hazards (source: https://www.nasa.gov/hrp/hazards):

1. **Space Radiation**
2. **Isolation and Confinement**
3. **Distance from Earth**: getting instructions, supplies and medical care gets harder the farther crews travel.
4. **Gravity Fields**
5. **Hostile/Closed Environments**

The table below maps Somacast features to NASA's named risks (source: https://www.nasa.gov/hrp/risks) and to two of the hazards. All crew vitals in Somacast are **simulated**. Metric ids are defined in `packages/core/src/domain/metrics.ts`.

| NASA risk or hazard | Somacast feature (file/metric) | Coverage (Strong / Partial / Gap) | Note |
| --- | --- | --- | --- |
| Risk of Inadequate Sleep and Irregular Schedules | `sleepHours` metric, alerts, forecast | Strong | Sleep calibrated to ISS (Barger et al. 2014) |
| Risk of Behavioral Changes and Psychiatric Disorders | `psychCheckin` (1–5) | Partial | Self-report only |
| Risk of Cardiovascular Adaptations | `restingHr`, `hrv` | Partial | Simulated |
| Risk of Reduced Cardiorespiratory and Musculoskeletal Fitness | `exerciseMin` | Partial | Simulated, minutes only |
| Risk of Radiation-Induced Cancers | `radiationDose` + solar-storm scenario | Partial | Daily dose tracking, not cancer risk; DONKI real events pending |
| Hazard: Hostile/Closed Environments | `cabinCo2` | Strong | NASA OCHMO CO2 limit (see [data-sources.md](data-sources.md)) |
| Hazard: Distance from Earth | Black-box outbox, LOS/AOS sync, SBAR handoff, uplink notes | Strong | The core design of Somacast |
| Risk of Spaceflight-Induced Bone Changes | None (exercise only as proxy) | Gap | Future: missed resistive exercise indicator |
| Risk of Altered Immune System Responses | None | Gap | Future: daily symptom check-in |

Decision support only, not a medical device. Coverage means the app tracks a related signal, not that it measures or prevents the risk.
