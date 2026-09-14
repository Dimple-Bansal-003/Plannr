# Plannr 🗓️

> **The honest, deterministic coursework & exam study planner for students.**
> Zero AI in the scheduling path. Zero sign-in gate. Zero permissions. 100% local persistence.

---

## Why Plannr?

Most scheduling tools (Motion, Reclaim, Sunsama) cost \$12–30/month, demand intrusive calendar read/write permissions, and attempt to coordinate meetings. Coursework is fundamentally different: students don't need calendar integrations — they need an honest, inspectable plan that tells them **when** to study for exams and complete assignments without privacy friction.

- **100% Deterministic Engine**: Task prioritization and time-slot packing use transparent mathematical formulas:
  $$\text{Urgency} = \frac{1}{\max(\text{days until deadline}, 0.5)}$$
  $$\text{Priority Score} = \text{Urgency} \times \text{Importance (1–5)}$$
- **Explainable Reasoning**: Every scheduled study session visibly displays *why* it was placed there (e.g. `💡 Why: Due in 2.6d • Weighted 5/5`).
- **50-Minute Focus Blocks with Breaks**: Large effort tasks (half-day 4h / full-day 8h) are automatically partitioned into 50-minute focus blocks with 10-minute suggested breaks.
- **Honest Overcommit Warning**: If a task cannot fit before its deadline given your recurring free time, Plannr explicitly flags it as **At Risk** with missing minutes instead of quietly pretending it will work.
- **Dedicated Overdue Alerts**: Past-deadline tasks are elevated to urgency 2.0, pinned to the top of the schedule, and highlighted with 1-tap completion.
- **Zero Permissions & Privacy First**: No calendar access, no contact access, no network accounts. Data is stored purely client-side via local storage.

---

## Tech Stack

- **Framework**: React Native + Expo (SDK 52)
- **Language**: TypeScript (Strict Mode)
- **Web Deployment**: Vercel SPA (`npx expo export -p web`)
- **Storage**: `@react-native-async-storage/async-storage` (local-first)
- **Testing**: Jest + ts-jest (11 test suites, 21 unit & acceptance tests)

---

## Getting Started

### 1. Run in Development
```bash
npm install
npx expo start
```
- Press `w` to open in your web browser.
- Or scan the QR code with **Expo Go** on your Android/iOS phone.

### 2. Run Test Suites
```bash
npm test
```

### 3. Deploy to Vercel
```bash
npx expo export -p web
```
The repository includes `vercel.json` configured for single-command zero-config deployment on [Vercel](https://vercel.com).

---

## License

MIT
