# Core engine (Phase 4)

Somacast compares each crew member with their own normal, not with a population average. All thresholds are illustrative and need expert review. Somacast is decision support, not a medical device.

## Rules

| Step | Rule | Requirement |
| --- | --- | --- |
| Baseline | Learned from the first 28 days, then frozen. Needs at least 14 days, otherwise "still learning". | REQ-002 |
| Alert | A metric past z = 2 in its bad direction for 3 days in a row. z of 3 or more is high severity. | REQ-003 |
| Reason | Every alert carries metric, value, baseline, z-score, days and a plain-English reason. | REQ-004, NFR-002 |
| Forecast (72 h) | **Storm**: a high personal alert, or 2+ personal alerts. **Cloudy**: any personal alert, a cabin alert (CO2, radiation), or a metric already near the line and trending past it within 72 h. **Clear**: none of these. | REQ-005 |
| Confidence | Low with under 14 days of data or more than 2 missing days in the last 7. | REQ-005 |

The baseline is frozen on purpose. A rolling baseline follows a slow decline and hides it. Re-baselining (for example by the flight surgeon) is future work.

## Measured on simulated data

| Check | Result |
| --- | --- |
| Normal days, crew-days with any alert (30 seeds) | about 0.1% |
| Normal days, forecast not Clear (15 seeds) | about 1.6%, never Storm |
| Blackout decline (starts day 45), first Storm for C2 (10 seeds) | day 58 to 72 |
| Blackout, healthy crew C1 | Cloudy from shared cabin CO2, never Storm |
| Solar storm, radiation alert | every crew member on day 62, gone by day 70 |
