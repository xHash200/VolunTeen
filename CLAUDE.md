# CLAUDE.md

Guidance for Claude Code when working in this repository. See also [AGENTS.md](AGENTS.md) (Expo-specific rules — always check versioned Expo docs).

## Project

VolunTeen — mobile app listing volunteer "jobs" at events, organized by Timișoara faculty student leagues.
Stack: React Native + Expo (SDK 58, run with Expo Go), Firebase (Firestore), React Navigation (bottom tabs + native stack).

## Structure

- `App.js` — navigation: tabs `JobsTab` (stack: `Jobs` → `JobDetail`) and `Leagues`.
- `src/firebase.js` — Firebase init from `EXPO_PUBLIC_FIREBASE_*` env vars; `db` is null when unconfigured.
- `src/data/DataContext.js` — live Firestore subscription to `leagues` and `jobs`; falls back to `src/data/sample.js`.
- `src/screens/` — screens. `src/theme.js` — colors, shared styles, date formatting.

## Data model (Firestore)

- `leagues/{id}`: name, fullName, university, faculty, description, website, verified
- `jobs/{id}`: title, event, leagueId, date (YYYY-MM-DD), location, spots, hours, category, description, requirements[], perks[]

## Commands

- `npx expo start` — dev server; scan QR with Expo Go.
- `npx expo install <pkg>` — always use for adding packages.
- `npx expo-doctor` — check dependency health.

## Conventions

- Default branch: `main`. License: MIT.
- Node may need PATH refreshed in this shell (installed after session start).
