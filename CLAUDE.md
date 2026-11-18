# CLAUDE.md

Guidance for Claude Code when working in this repository. See also [AGENTS.md](AGENTS.md) (Expo-specific rules — always check versioned Expo docs).

## Project

VolunTeen — mobile app listing volunteer "jobs" at events, organized by Timișoara faculty student leagues, with accounts, friends and chat.
Stack: React Native + Expo (SDK 58, Expo Go / EAS Build), Firebase (Auth email/password + Firestore), React Navigation (bottom tabs + native stacks).

## Accounts & roles

- App is gated: signed out → AuthStack (Welcome → SignIn / AccountType → SignUpPersonal / SignUpOrganization).
- **personal**: `users/{uid}.accountType = "personal"` (missing = personal for old accounts).
- **organization**: `accountType = "organization"`, `orgStatus` pending|verified|rejected. Details + verification code in `orgApplications/{uid}`. Verification = email confirmed + org sends the `VT-XXXXXX` code from its official page/email + owner approves in Admin tab.
- **owner**: has a doc at `owners/{uid}`. Full Admin tab: Organizations, Content, Team (add/remove owners + testers). First owner must be created in the Firebase console.
- **tester**: has a doc at `testers/{uid}` (added by owners in Admin → Team). Admin tab without Team: review orgs + edit jobs/events/leagues. Sees Tester badge + debug card on Profile.
- **organization = organizer**: only verified organizations (`isOrganizer` = `orgStatus == "verified"`) create events and manage their roles + applicants (`events.createdBy`, rules `ownsEvent()`). Tab titled "My events". There is no separate organizer team role anymore.
- **event helper**: a volunteer accepted into an event role whose `category` is `"Organizer"` (`ORGANIZER_CATEGORY` in `src/config.js`). Gets `eventHelpers/{eventId_uid}`, the "My events" tab ("Events I help organize") and can accept/decline applicants for that event's other roles, not edit the event/roles and not pick other Organizers.
- `isStaff` (useAuth + rules) = owner or tester. `canManageEvents` = staff or organization. `canEditEvent(event)` = staff or creator. `canReviewEvent(event)` = canEditEvent or helper.
- Public Events/Jobs tabs are read-only; all event management lives in the Admin/My events tab (Events section → ManageEvent → JobApplicants / ContentEdit).
- Role categories (pick-list): `ROLE_CATEGORIES` in `src/config.js`. Organizer roles are sorted first and highlighted (`sortRoles`).
- `src/config.js` — `VERIFICATION_CONTACT` (where orgs send the code), org types.
- Logo: `assets/logo.png` (placeholder copy of icon.png — replace with the real logo).

## Structure

- `App.js` — auth gate + tabs (each a stack): Jobs, Events, Leagues, Chat (ChatHome → ChatRoom / NewGroup / AddFriend), Profile (→ ResubmitOrg), Admin (staff + organizers: AdminHome → ManageEvent / OrgReview / ContentEdit / AddTeamMember).
- `src/admin/api.js` — org review, team (owners/testers), content save/delete. `src/admin/contentSchemas.js` — editor field definitions for jobs/events/leagues.
- `src/components/OrgFields.js` — shared organization details form + validation.
- `src/firebase.js` — app/db/auth init from `EXPO_PUBLIC_FIREBASE_*` env vars (`.env.local` locally, `eas.json` for builds). All null when unconfigured.
- `src/auth/AuthContext.js` — `useAuth()`: user, profile (`users/{uid}`), signIn/signUp/signOut/updateProfile.
- `src/data/DataContext.js` — `useData()`: live `leagues`, `events`, `jobs`; falls back to `src/data/sample.js`.
- `src/chat/api.js` — friendships, chats, messages: hooks + write helpers.
- `src/components/ui.js` — Button, Segmented, Avatar, SignInPrompt. `src/theme.js` — colors, shared styles.
- Light/dark theme (Profile → ⚙ Settings) switches live. `colors`/`common` are proxies for the current theme. Write style sheets as `const styles = themed((colors) => StyleSheet.create({...}))` and never put `colors.x` in a plain module-level constant (use a getter or read it inside the component). App.js remounts the NavigationContainer (keyed by theme, nav state kept) on change.

## Data model (Firestore)

- `leagues/{id}`: name, fullName, university, faculty, description, website, verified
- `events/{id}`: title, leagueId (optional), date (YYYY-MM-DD), time, location, category, description, createdBy, organizerName
- `jobs/{id}`: title, event, eventId, leagueId, date, location, spots, hours, category, description, requirements[], perks[], createdBy, acceptedCount
- Account deletion: Settings → Delete my account (`src/auth/deleteAccount.js`). If you add a new per-user collection, delete it there too.
- `jobs/{id}/applications/{uid}`: uid, name, age, status pending|accepted|declined, appliedAt, reviewedBy, reviewedAt. Personal accounts only; applicants read their own, event creator/staff manage (`src/applications/api.js`, Admin → event → role → JobApplicants).
- `users/{uid}`: displayName, displayNameLower (for search), accountType, orgStatus (orgs), (birth date is NOT here — it's private in `users/{uid}/private/profile` { birthDate } (YYYY-MM-DD, 16+, set once, readable by self + staff; `useAuth().birthDate`). Organizers see age via `applications.age`, which rules verify against it), country, county, city (picked from `src/data/romania.js` via `PlaceFields`/`SelectField` in ui.js; shown with `formatPlace`), faculty, bio, leagueId, photo (256px JPEG data URI, ~30 KB — no Firebase Storage; see `src/profile/photo.js`)
- `orgApplications/{uid}`: orgName, orgType, university, faculty, leagueId, website, socialUrl, contactName, contactRole, phone, notes, contactEmail, verificationCode, status, emailVerified, rejectReason, reviewedBy, reviewedAt
- `owners/{uid}`, `testers/{uid}`: displayName, addedBy, addedAt
- `eventHelpers/{eventId_uid}`: eventId, uid, name, jobId — written by `setApplicationStatus` / `withdrawApplication` (`src/applications/api.js`)
- `friendships/{uidA_uidB}` (sorted): members[2], memberNames{}, requestedBy, status pending|accepted
- `chats/{id}`: type direct|group, name (group), members[], memberNames{}, lastMessage, lastSender, updatedAt. Direct chat id: `dm_<uidA_uidB>`.
- `chats/{id}/messages/{id}`: text, senderId, senderName, createdAt

Security rules: `firestore.rules` (deploy with `npx firebase-tools deploy --only firestore:rules`). Public collections are writable only by staff (owners + testers). Roles are enforced there, not just in the UI.
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
