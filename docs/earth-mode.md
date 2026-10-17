# Earth mode (Phase 10)

Somacast is built for a crew far from Earth: a link that drops for days, a doctor who is not in the room. The same problem exists on Earth wherever a small team works far from a clinic on an unreliable connection. Earth mode shows that the same engine fits those places.

Earth mode is a **wording switch**. It changes words and examples only. Thresholds, rules, alerts, forecasts, the black-box log and sync are exactly the same in both modes.

## How to switch

- **Phone:** Today screen, **WORDING** row, tap **Space** or **Earth**.
- **Ground console:** the **Space / Earth** buttons in the header.

The choice is per device and is not saved: the app and the console open in Space.

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

## Three Earth settings

These are examples of where the idea could apply. Somacast has not been tested or validated in any of them.

| Setting | Why offline-first helps |
| --- | --- |
| Antarctic research station | A small winter team can be cut off from outside medical help for long periods, so the log and the forecast must work on site and hand a summary to a remote doctor whenever the connection allows. |
| Offshore rig | The nearest doctor is usually onshore and the link runs over satellite or radio, so nothing should be lost when it drops and the backlog should sync on its own when it comes back. |
| Remote rural clinic | A health worker may see people where mobile data comes and goes, so readings and alerts are stored on the phone and the remote doctor gets one structured handoff at the next connection. |

## What does not change (known gaps)

- **Engine sentences keep the Space wording.** Alert reasons, forecast reasons ("this crew member's usual range"), coach actions and the SBAR handoff are written by the engine and stored in the shared log. One record is read by the phone and the console, which may be in different modes, so these texts are not reworded. A display-time rewording is future work.
- **Same metrics.** Earth mode keeps all seven simulated metrics, including radiation dose, which matters little in most Earth settings. A real Earth profile would choose its own metrics and thresholds with clinical experts.
- **Same simulated data.** Earth mode shows the same simulated crew, names and scenarios. All values are simulated.
- **Decision support only.** In every mode Somacast is decision support, not a medical device. The remote doctor decides.
