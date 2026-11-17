# CLAUDE.md

Guidance for Claude Code when working in this repository. See also [AGENTS.md](AGENTS.md) (Expo-specific rules — always check versioned Expo docs).

## Project

VolunTeen — mobile app listing volunteer "jobs" at events, organized by Timișoara faculty student leagues, with accounts, friends and chat.
Stack: React Native + Expo (SDK 58, Expo Go / EAS Build), Firebase (Auth email/password + Firestore), React Navigation (bottom tabs + native stacks).

## Accounts & roles

- App is gated: signed out → AuthStack (Welcome → SignIn / AccountType → SignUpPersonal / SignUpOrganization).
- **personal**: `users/{uid}.accountType = "personal"` (missing = personal for old accounts).
- **organization**: `accountType = "organization"`, `orgStatus` pending|verified|rejected. Details + verification code in `orgApplications/{uid}`. Verification = email confirmed + org sends the `VT-XXXXXX` code from its official page/email + owner approves in Admin tab.
- **owner**: has a doc at `owners/{uid}`. Sees the Admin tab (review orgs, add/remove owners). First owner must be created in the Firebase console.
- `src/config.js` — `VERIFICATION_CONTACT` (where orgs send the code), org types.
- Logo: `assets/logo.png` (placeholder copy of icon.png — replace with the real logo).

## Structure

- `App.js` — auth gate + tabs (each a stack): Jobs, Events, Leagues, Chat (ChatHome → ChatRoom / NewGroup / AddFriend), Profile (→ ResubmitOrg), Admin (owners only: AdminHome → OrgReview / AddOwner).
- `src/admin/api.js` — org review + owner management.
- `src/components/OrgFields.js` — shared organization details form + validation.
- `src/firebase.js` — app/db/auth init from `EXPO_PUBLIC_FIREBASE_*` env vars (`.env.local` locally, `eas.json` for builds). All null when unconfigured.
- `src/auth/AuthContext.js` — `useAuth()`: user, profile (`users/{uid}`), signIn/signUp/signOut/updateProfile.
- `src/data/DataContext.js` — `useData()`: live `leagues`, `events`, `jobs`; falls back to `src/data/sample.js`.
- `src/chat/api.js` — friendships, chats, messages: hooks + write helpers.
- `src/components/ui.js` — Button, Segmented, Avatar, SignInPrompt. `src/theme.js` — colors, shared styles.

## Data model (Firestore)

- `leagues/{id}`: name, fullName, university, faculty, description, website, verified
- `events/{id}`: title, leagueId, date (YYYY-MM-DD), time, location, category, description
- `jobs/{id}`: title, event, eventId, leagueId, date, location, spots, hours, category, description, requirements[], perks[]
- `users/{uid}`: displayName, displayNameLower (for search), accountType, orgStatus (orgs), faculty, bio, leagueId
- `orgApplications/{uid}`: orgName, orgType, university, faculty, leagueId, website, socialUrl, contactName, contactRole, phone, notes, contactEmail, verificationCode, status, emailVerified, rejectReason, reviewedBy, reviewedAt
- `owners/{uid}`: displayName, addedBy, addedAt
- `friendships/{uidA_uidB}` (sorted): members[2], memberNames{}, requestedBy, status pending|accepted
- `chats/{id}`: type direct|group, name (group), members[], memberNames{}, lastMessage, lastSender, updatedAt. Direct chat id: `dm_<uidA_uidB>`.
- `chats/{id}/messages/{id}`: text, senderId, senderName, createdAt

Security rules: `firestore.rules` (deploy with `npx firebase-tools deploy --only firestore:rules`). Public collections are writable only by owners. Roles are enforced there, not just in the UI.
Avoid queries needing composite indexes — sort client-side.

## Commands

- `npx expo start` — dev server; scan QR with Expo Go.
- `npx expo install <pkg>` — always use for adding packages.
- `npx expo-doctor` — check dependency health.
- `npm run seed` — upload sample data (only works while Firestore is in test mode).
- `npx eas-cli build --platform android --profile preview` — shareable APK (Expo account: dvmi).

## Conventions

- Default branch: `main`. License: MIT.
- Node may need PATH refreshed in this shell (installed after session start).
