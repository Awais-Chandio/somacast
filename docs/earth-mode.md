# Earth mode (Phase 10)

Somacast is built for a crew far from Earth: a link that drops for days, a doctor who is not in the room. The same problem exists on Earth wherever a small team works far from a clinic on an unreliable connection. Earth mode shows that the same engine fits those places.

Earth mode is a **wording switch**. It changes words and examples only. Thresholds, rules, alerts, forecasts, the black-box log and sync are exactly the same in both modes.

## How to switch

- **Phone:** Today screen, **WORDING** row, tap **Space** or **Earth**.
- **Ground console:** the **Space / Earth** buttons in the header.

The choice is saved per device: the phone keeps it in AsyncStorage and the console in the browser's localStorage, so each opens in the last chosen mode (Space the first time). If storage is blocked or fails, the app opens in Space and still works; the choice is just not remembered.

## What changes

All words live in one dictionary, `packages/core/src/copy/copy.ts`. A test (`copy.test.ts`) checks that both modes have the same keys and that the Earth words contain no space jargon.

| Space | Earth |
| --- | --- |
| LOS (loss of signal) | Offline |
| AOS (acquisition of signal) | Back online |
| crew member / crew | team member / team |
| flight surgeon | remote doctor |
| Cabin CO2 partial pressure | Indoor CO2 partial pressure |
| mission day | day |
| Body weather for crews beyond Earth | Body weather for teams far from a clinic |
| CMO (in coach actions) | on-site medic |

## Engine sentences

Alert reasons, forecast reasons, coach actions and the SBAR handoff are written by the engine. The shared log stores them in Space wording, and that stored text never changes. Screens do not show the stored text: they write it again from the structured fields (metric, value, usual value, z, days, forecast state, trends, the handoff's facts) with the words for the current mode, in `packages/core/src/copy/engineText.ts`.

- The engine writes the stored text with the same functions in Space wording, so in Space a screen shows exactly what is in the log (tested over every alert and forecast of 3 scenarios and 5 seeds).
- In Earth mode only the words change: "Cabin CO2" becomes "Indoor CO2", "crew member" becomes "team member", "Out of contact (LOS)" becomes "Offline", "mission day" becomes "day", and coach actions name the on-site medic instead of the CMO. Every number, state and alert is the same.
- The phone and the console can be in different modes and still read the same record.

## Three Earth settings

These are examples of where the idea could apply. Somacast has not been tested or validated in any of them.

| Setting | Why offline-first helps |
| --- | --- |
| Antarctic research station | A small winter team can be cut off from outside medical help for long periods, so the log and the forecast must work on site and hand a summary to a remote doctor whenever the connection allows. |
| Offshore rig | The nearest doctor is usually onshore and the link runs over satellite or radio, so nothing should be lost when it drops and the backlog should sync on its own when it comes back. |
| Remote rural clinic | A health worker may see people where mobile data comes and goes, so readings and alerts are stored on the phone and the remote doctor gets one structured handoff at the next connection. |

## What does not change (known gaps)

- **Older handoffs stay in Space wording.** A handoff sent before the handoff's facts were stored has only its text, so it shows that Space text in both modes.
- **Same metrics.** Earth mode keeps all seven simulated metrics, including radiation dose, which matters little in most Earth settings. A real Earth profile would choose its own metrics and thresholds with clinical experts.
- **Same simulated data.** Earth mode shows the same simulated crew, names and scenarios. All values are simulated.
- **Decision support only.** In every mode Somacast is decision support, not a medical device. The remote doctor decides.
