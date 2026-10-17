# Somacast Requirements (Phase 1)

Verification methods: Test, Demo, Inspection, Analysis. Items marked (guess) are illustrative, expert review required. The Test column of the traceability table is filled in as tests are written.

## Must (9)

| ID | The system shall... | Verify | Module (planned) |
|---|---|---|---|
| REQ-001 | compute a separate baseline for each crew member from that person's own history | Test | core/baseline |
| REQ-002 | show a "learning" state until 14 days (guess) of data exist | Test | core/baseline |
| REQ-003 | flag a metric when its z-score exceeds 2 (guess) for 3 (guess) days in a row, both configurable | Test | core/anomaly |
| REQ-004 | attach {metric, value, baseline, zscore, days, reason} to every alert | Test, Inspection | core/explain |
| REQ-005 | forecast the next 72 h as Clear, Cloudy or Storm, and mark it "low confidence" when fewer than 14 days of data exist or more than 2 of the last 7 days are missing (guess) | Test, Analysis | core/forecast |
| REQ-006 | run all Must functions (REQ-001 to REQ-005, REQ-007, REQ-009) with the network disabled | Demo | mobile |
| REQ-007 | write readings, alerts and crew actions to an append-only black-box log that survives app restart | Test | mobile/db |
| REQ-008 | sync a backlog of 5,000 queued items on link return so the ground store holds exactly 5,000 items with no duplicate idempotency keys (the ground store is a local mock until Phase 7) | Test | mobile/sync |
| REQ-009 | generate an SBAR handoff from active alerts, with evidence links | Test, Inspection | core/sbar |

## Should (7)

| ID | The system shall... | Verify | Module (planned) |
|---|---|---|---|
| REQ-010 | let the crew member log a psych check-in (1 to 5, optional note) in under 1 minute (guess) | Demo | mobile |
| REQ-011 | show a 14-day sparkline with the baseline band per metric | Inspection | mobile |
| REQ-012 | suggest actions from JSON rules with a rationale, labelled "illustrative, expert review required" | Test, Inspection | core/coach |
| REQ-013 | cap alerts at N (guess) per day, ordered by severity | Test | core/coach |
| REQ-014 | generate the same simulated data from the same seed (4 crew, 90 days, 3 scenarios) | Test | core/sim |
| REQ-015 | calibrate sleep with published ISS statistics and use NASA DONKI for radiation, with sources cited | Inspection | core/sim |
| REQ-016 | offer a demo speed control ("1 day = 5 s") | Demo | mobile |

## Could (4)

| ID | The system shall... | Verify | Module (planned) |
|---|---|---|---|
| REQ-017 | provide a web console with crew status and a handoff inbox | Demo | web |
| REQ-018 | deliver a surgeon's uplink note to the device on the next link | Demo | web, mobile |
| REQ-019 | switch to an Earth (remote clinic) profile by config only | Demo | core |
| REQ-020 | offer optional LLM wording that never changes severity or action (default off) | Test | core |

## Non-functional

| ID | Requirement | Verify |
|---|---|---|
| NFR-001 | Every screen showing vitals says "Simulated data"; every rule is labelled illustrative; every handoff says "decision support, not a medical device" | Inspection |
| NFR-002 | No alert or forecast without a reason | Inspection |
| NFR-003 | No row lost or duplicated across app kill, wrong clock, NaN or negative input | Test |
| NFR-004 | Dark theme, contrast 4.5:1 or better, status never by colour alone, touch targets 48 px or more | Inspection |
| NFR-005 | One crew member can never read another's data (server-side) | Test (when backend exists) |
| NFR-006 | Cost stays $0; a fresh clone runs in 3 commands | Inspection, Demo |

## Scenario coverage (Musts)

| Scenario | Requirements |
|---|---|
| S1 Normal day | REQ-001, 002, 006 |
| S2 Blackout | REQ-003, 004, 005, 007 |
| S3 Link returns | REQ-008, 009 |
