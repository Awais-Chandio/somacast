# Somacast

**Body weather for crews beyond Earth.**

Somacast learns each crew member's personal baseline, forecasts the next 72 hours as Clear, Cloudy or Storm, keeps a black-box log during communication blackouts, and hands a structured summary to the flight surgeon when the link returns.

## Quick start

Core logic (TypeScript, Jest):

```bash
cd packages/core
npm ci
npm test
```

Mobile app (React Native, Android):

```bash
cd apps/mobile
npm ci
npx react-native start
```

Then, in a second terminal:

```bash
cd apps/mobile
npx react-native run-android
```

## Important

- All vitals shown in Somacast are **simulated** and labelled as simulated.
- Somacast is **decision support, not a medical device**. It never diagnoses; the flight surgeon decides.

See [docs/conops.md](docs/conops.md) and [docs/requirements.md](docs/requirements.md).

---

Somacast is an independent team project for the NASA Space Apps Challenge. It is not affiliated with or endorsed by NASA.
