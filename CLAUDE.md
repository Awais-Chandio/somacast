# Somacast: instructions for Claude

Project: **Somacast** ("Body weather for crews beyond Earth"), a solo entry for the NASA Space Apps Challenge 2026, Challenge #5 (health monitoring software for astronauts).
Owner: Muhammad Awais (React Native / TypeScript developer).

---

## 1. How to work with me (most important)

- **Claude writes the code, Awais reviews it** (Awais's explicit choice, 2026-10-17). After each change give a short Hinglish explanation: what changed and why, analogy first. Never skip tests.
- Setup commands (install, config, git, CLI) are fine to give directly, with one line on what each does.
- Explain **analogy first**, then the technical detail. Keep text short. Prefer a small diagram or table over long paragraphs.
- Reply in **Hinglish** (Roman Urdu + English). Keep code, commands and technical terms in English.
- When a real choice exists, ask him; do not decide silently.
- When he pastes an error: first ask what he thinks the cause is (3 guesses), then explain.
- Before testing him on a concept, explain the concept with an example first.
- Everything inside the app, the docs, the README, the video and the slides is written in **English**.

## 2. Project facts

- Idea: learns each crew member's personal baseline (sleep, exercise, cabin CO2, radiation), forecasts the next 72 hours as **Clear / Cloudy / Storm**, keeps a black-box log during communication blackouts (LOS), and sends an SBAR-style handoff to the flight surgeon when the link returns (AOS). The surgeon can uplink notes back. Optional "Earth mode" (same engine, remote-clinic profile).
- Repo layout (monorepo, at `~/somacast`):
  - `apps/mobile`: React Native CLI + TypeScript (RN 0.88). Crew Medical Officer view. Android first (no Xcode/Apple ID yet), iOS later from the same code.
  - `apps/web`: React + Vite + TypeScript. Flight surgeon ground console (Phase 8, later).
  - `packages/core`: pure TypeScript shared logic (simulator, baseline, anomaly, forecast, coach rules, Zod schemas, Jest). Mobile and web both import it.
  - `docs`: ConOps, requirements, traceability, limitations.
- Stack: SQLite on device, Supabase (Postgres, auth, realtime, RLS roles `crew` and `flight_surgeon`), Zustand + React Query, react-native-svg, Zod, Jest. Optional LLM wording (default off, never decides severity).
- Phases (do not skip): 0 ConOps, 1 Requirements, 2 Workspace, 3 Data + simulator, 4 Core engine, 5 Mobile, 6 Blackout/outbox, 7 Backend, 8 Ground console, 9 Coach rules + SBAR, 10 Earth mode, 11 V&V, 12 Story/demo/submission. Install libraries only when their phase arrives.

## 3. Honesty and safety rules (judges look at validity)

- All vitals are **simulated and clearly labelled as simulated**. Real astronaut HR/HRV are not public.
- Real data used: published ISS sleep statistics (Barger et al. 2014) for calibration, NASA DONKI space-weather events for radiation scenarios. Confirm the exact DONKI endpoint from its docs before relying on it.
- Somacast is **decision support, not a medical device**. The flight surgeon decides. The app never diagnoses. Severity comes only from rules and the engine, never from an LLM.
- Every rule and threshold is labelled `illustrative, expert review required`.
- Every alert carries its reason: `{metric, value, baseline, zscore, days, reason}`.
- Every claim needs a source or a "simulated" label. Mark guesses as guesses.
- Cost stays at $0 (simulators, free tiers). Keep `ANTHROPIC_API_KEY` unset.
- Before submission, check the official rules guide for the pre-built-code rule and the AI-tool disclosure rule.

---

## 4. NASA Space Apps brand guide (applies to the app, web console, logo, video, slides, README)

Source: NASA Space Apps Brand Guidelines (updated June 25, 2026). Follow it for everything visual.

### 4.1 Colours

| Name | Hex | Use |
|---|---|---|
| Deep Blue ("Blue Near Black") | `#07173F` | Default background, gradient end, text on light |
| Electric Blue | `#0042A6` | Hero panels, gradient start |
| Neon Blue | `#0960E1` | Links and secondary buttons on white |
| Blue Yonder | `#2E96F5` | Secondary text on Deep Blue only, chart accents |
| Neon Yellow | `#EAFE07` | **Accent only**: buttons, highlights, icons, link text on dark. **Never a background panel or a headline colour.** |
| Rocket Red | `#E43700` | Large text, icons, borders, hover. **Never a background for text.** |
| Martian Red | `#8E1100` | Dark red fill with white text |
| White | `#FFFFFF` | Body text on blue, light cards |

- The palette strongly favours blue. Use roughly 60% blues, 30% white, 10% accent.
- Do not convey meaning by colour alone: always add an icon and a word.

### 4.2 Gradient

- Linear, from top-left **Electric Blue** to bottom-right **Deep Blue**, about 45° descending (CSS `135deg`).
- The transition spreads across the whole field and is eased so it is a gentle fade, never abrupt.
- Eased stops: `#0042A6 0%, #013E9B 20%, #023382 40%, #052663 60%, #061B4A 80%, #07173F 100%`.

### 4.3 Contrast (WCAG, minimum 4.5:1 for text)

Good pairs (standard WCAG formula): white on Deep Blue 17.45, Neon Yellow on Deep Blue 15.52, Deep Blue on Neon Yellow 15.52, white on Martian Red 9.42, white on Electric Blue 9.01, Neon Yellow on Electric Blue 8.02, Blue Yonder on Deep Blue 5.65, Deep Blue on Blue Yonder 5.65, white on Neon Blue 5.57, Neon Blue on white 5.57.

Avoid for small text: white on Rocket Red 4.33, Rocket Red on Deep Blue 4.03 (large text only), white on Blue Yonder 3.09 (large text only), Blue Yonder on Electric Blue 2.92, Rocket Red on Electric Blue 2.08, Deep Blue on Electric Blue 1.93, Neon Yellow on Blue Yonder 2.74, Rocket Red on Neon Blue 1.13.

Note: the guide's own table lists white on Rocket Red as 4.92; the standard formula gives 4.33, so treat Rocket Red as large-text, icon and border only.

### 4.4 Typography

- **Headings:** Fira Sans Black or Fira Sans Bold. Also allowed for titles: Overpass Bold, Overpass Regular.
- **Body:** Overpass Regular, Overpass Bold, Overpass Italic (SemiBold for labels; the type scale also lists Light).
- **Code and preformatted text:** Fira Code Regular and Bold.
- All free under libre licences and on Google Fonts.

Type scale (reference sizes; scale down on small phones):

| Level | Font | Size | Notes |
|---|---|---|---|
| H1 / hero | Fira Sans Black | 60 px, line height 120% | ALL CAPS, 5% letter spacing |
| H2 / subheading | Overpass Regular | 42 px, line height 120% | May alternate colours line by line |
| H3 | Overpass SemiBold | 20 px, line height 150% | ALL CAPS |
| Body | Overpass Regular | 20 px, line height 150% | Paragraph spacing about 20 px |
| Button / link | Overpass Bold | 24 px | Buttons ALL CAPS |

Text colour rules:
- Body text only on **Deep Blue, Electric Blue or white**. Never body text on Rocket Red.
- On Deep Blue: H1 white, subheading alternates Rocket Red ("NASA Red") and white, body white.
- On Electric Blue: H1 white, subheading alternates Neon Yellow and white, body white.
- On white: H1 Deep Blue, subheading alternates Rocket Red and Deep Blue, body in a dark neutral (Deep Blue is the safe choice).
- Neon Yellow text sparingly: links and highlights, not headlines.

### 4.5 Buttons and links

- **Primary button:** Neon Yellow fill, Deep Blue text, Overpass Bold, ALL CAPS, slightly rounded corners.
- **Secondary link:** Neon Yellow underlined on dark backgrounds; Neon Blue underlined on white.
- **Hover:** Rocket Red with underline.
- Visible focus state on every interactive element. Touch targets at least 48 px in the app.

### 4.6 Shapes and symbols (icons)

- Use symbols only when the meaning is reasonably unambiguous; otherwise use a text label.
- Style: lightweight, **line-based, one consistent stroke weight**. Libraries: Phosphor, Feather or Streamline Line. Custom icons are fine if they follow this style.
- Digital sizes: round to the nearest power of two or a common size (16, 24, 32, 48) to avoid blurry anti-aliasing.
- Icons must contrast extremely well against the background.

### 4.7 Patterns

- Patterns suggest orbits, coordinates, waves, cells, code and geometry.
- Screen them back to about **25% opacity** over a brand colour, preferably blue.
- Any custom background pattern or image: single-colour vector artwork only, screened back by the same rule.

### 4.8 Photography

- Always inside a **holding shape**: rectangles for websites, circles for social and self-contained assets. Circles may overlap like celestial objects, optionally with concentric orbit lines.
- Full-colour, sufficient resolution, no text or designed content on top, no photo manipulation or artificial elements.

### 4.9 Awards and badges

- The guide shows illustrated 3D award icons (Most Inspirational, Best Mission Concept, Galactic Impact, Best Use of Data, Local Impact, Global Community, Best Use of Technology, Best Use of Storytelling, Best Use of Science, Art & Technology).
- A badge = an icon in a circular holding shape with a white ring.
- **Never show an award icon on Somacast materials as if we won.** A plain white-ring badge with our own icon (for example "phase complete") is fine.

### 4.10 Logos

- The Space Apps logo is a responsive logo (default, motif and small versions). Do **not** use, redraw, recolour or imitate the Space Apps logo or the NASA insignia as Somacast's logo.
- Somacast uses its **own mark** (white-ring badge with sun, cloud and heartbeat line, Fira Sans Black wordmark, orbit pattern at 25%).
- For any logo: do not tilt, stretch, recolour, rearrange or add strokes, and do not place it on busy imagery.
- Footer line on public pages: "Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA."

### 4.11 Somacast UI specifics

- Dark mode by default (the station has a night cycle): Deep Blue background, white text, Neon Yellow for the primary action.
- Weather status is always **icon + word + colour**:
  - Clear: sun icon, Blue Yonder
  - Cloudy: cloud icon, Neon Yellow
  - Storm: storm icon, Rocket Red
  Text stays white.
- Tokens live in one shared file (`tokens.ts` in `packages/core`); never hardcode colours or font names in components.
- Fonts to load: Fira Sans (Black, Bold), Overpass (Regular, SemiBold, Bold, Italic), Fira Code.

### 4.12 Brand checklist before any release

- [ ] Only palette colours; Neon Yellow only as accent
- [ ] Body text on Deep Blue, Electric Blue or white, contrast 4.5:1 or better
- [ ] Fira Sans for headings, Overpass for body, Fira Code for code
- [ ] H1 in caps with 5% letter spacing
- [ ] Status never by colour alone
- [ ] Icons line-based, one stroke weight, standard sizes
- [ ] Patterns at about 25% opacity, photos in holding shapes with no text on top
- [ ] No Space Apps or NASA logo used as ours; no award icons implying a win
- [ ] "Simulated data" labelled on every screen that shows vitals
