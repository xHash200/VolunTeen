# CLAUDE.md

Guidance for Claude Code when working in this repository. See also [AGENTS.md](AGENTS.md) (Expo-specific rules — always check versioned Expo docs).

## Project

VolunTeen — mobile app listing volunteer "jobs" at events, organized by Timișoara faculty student leagues, with accounts, friends and chat.
Stack: React Native + Expo (SDK 58, Expo Go / EAS Build), Firebase (Auth email/password + Firestore), React Navigation (bottom tabs + native stacks).

## Accounts & roles

- App is gated: signed out → AuthStack (Welcome → SignIn / AccountType → SignUpPersonal / SignUpOrganization).
- **personal**: `users/{uid}.accountType = "personal"` (missing = personal for old accounts).
- **organization**: `accountType = "organization"`, `orgStatus` pending|verified|rejected. Details + verification code in `orgApplications/{uid}`. Verification = email confirmed + org sends the `VT-XXXXXX` code from its official page/email + owner approves in Admin tab.
- **owner**: has a doc at `owners/{uid}`. Full Admin tab: Organizations, Content, Team (add/remove owners, admins + testers). Tag [OWN]. First owner must be created in the Firebase console.
- **admin**: doc at `admins/{uid}` (added by owners). Tester powers + Team tab limited to adding/removing testers. Tag [ADM].
- **tester**: has a doc at `testers/{uid}` (added by owners or admins in Admin → Team). Admin tab without Team: review orgs + edit jobs/events/leagues. Sees Tester badge + debug card on Profile. Tag [QA].
- **Role tags**: `src/components/RoleTag.js` — OWN/ADM/QA/ORG drawn as a colored pill (a View, not text, so typing "[OWN]" can't fake one) before a name, highest role only (`tagFor`). Use `NameWithTag` (pill + name in a row; don't nest a pill inside `<Text>`). For other people use `useRoleTagOf(uid, profile)`. Shown on Profile, ApplicantProfile, Group info members and chat sender names. Names, nicknames and org names also can't contain any bracket (`[] () {} <>`), `\ | /`, or look-alikes: `nameError`/`stripBlockedChars` in `src/profile/names.js`, enforced again in rules (`noBrackets`). Any new name field must use them.
- **Copied names**: names copied onto other docs (`messages.senderName`, `chats.lastSender`, your own `memberNames` entry in chats/friendships, `applications.name`) must equal the writer's `users/{uid}.displayName` — rules `myName()`/`ownNameOk()`. Always write `useAuth().displayName`. Chat shows the sender's live profile name + pill (`SenderLabel` in ChatRoomScreen), the stored copy is only a fallback.
- **Team chats**: `chats/team_owners` (owners) and `chats/team_staff` (owners + admins + testers), type `team`, no `members` — access is by role in rules (`inTeamChat`), so they follow Admin → Team automatically. `TEAM_CHATS` + `useTeamChats` in `src/chat/api.js`; shown under "Team" at the top of Chat → Groups; created on first open.
- **Event chats**: `chats/event_<eventId>`, type `event` (`src/chat/api.js`: `ensureEventChat`, `joinEventChat`, `leaveEventRole`, `syncEventChatRole`). The event's organization (`createdBy`) is always in it; accepting someone into any of the event's roles adds them (`setApplicationStatus`, best effort after the decision), declining/withdrawing removes them unless they're still accepted in another role (`memberRoles.{uid}.{jobId}`). JobApplicants self-heals missing members. `removed.{uid}` remembers who left / was removed so the sync doesn't re-add them; a new acceptance or a manual add clears it. Shown under "Events" in Chat → Groups; ManageEvent has an "Event chat" button (creates it, and joins staff/helpers who aren't in it).
- **Group admins** (`isChatAdmin` in api.js + rules): group chats → `createdBy`; event chats → the event's organization, staff and its event helpers. Admins change the photo (`chats/{id}.photo`, 256px JPEG data URI from `pickGroupPhoto`, < 200 KB), name (≤ 50), description (≤ 300), add friends (AddMembers screen) and remove people. Everyone else can only post and leave (rules `leavingSelf` / `ownRolesOnly`). Team chats are fixed.
- **Group info** (`ChatInfoScreen`; tap the chat header's picture/name or ⋮, not in DMs): photo, name, description (team chats: fixed text from `TEAM_CHATS`), event details for event chats, created/last activity, members with role tag (event chats: their roles at the event), admin add/remove, Leave.
- **organization = organizer**: only verified organizations (`isOrganizer` = `orgStatus == "verified"`) create events and manage their roles + applicants (`events.createdBy`, rules `ownsEvent()`). Tab titled "My events". There is no separate organizer team role anymore.
- **event helper**: a volunteer accepted into an event role whose `category` is `"Organizer"` (`ORGANIZER_CATEGORY` in `src/config.js`). Gets `eventHelpers/{eventId_uid}`, the "My events" tab ("Events I help organize") and can accept/decline applicants for that event's other roles, not edit the event/roles and not pick other Organizers.
- `isStaff` (useAuth + rules) = owner, admin or tester. `canManageTeam` = owner or admin. `canManageEvents` = staff or organization. `canEditEvent(event)` = staff or creator. `canReviewEvent(event)` = canEditEvent or helper.
- **Leagues tab** (`LeaguesScreen`): two sections — Student leagues (`leagues`) and Verified organizations (`useVerifiedOrgs` in `src/data/orgs.js`, live `users` query accountType organization + orgStatus verified), each with the ORG pill and event count; tap → UserProfile.
- **League claiming**: a league and its organization account are one thing. An org of type `STUDENT_LEAGUE` ("Student league", `src/config.js`) that picked a league claims it when approved: `leagues/{id}.orgUid = uid` (`claimFor` / `approveOrg(uid, reviewer, claimLeagueId)` / `claimLeague` / `unclaimLeague` in `src/admin/api.js`). One account per league — OrgReview warns if it's taken. Revoking/rejecting drops the claim; account deletion releases it (rules let the org only remove its own `orgUid`). A claimed league counts as verified, shows "Managed by" the org, and that org isn't repeated under Verified organizations. Claims by accounts that aren't verified right now are ignored in the UI. Events still belong to the org account (`createdBy`); there is no separate league account.
- **Verified hours**: `attendance/{jobId_uid}` (`src/attendance/api.js`). From the event day on (`attendanceOpen`), whoever manages a role's applicants marks each accepted volunteer Attended (hours, default from the role's "09:00–14:00" via `hoursFromRange`) or No-show, in JobApplicants (`AttendanceControls`). Rules: only accepted applicants, `eventId` must match the job, hours 0 < h ≤ 250 (`MAX_HOURS`, rules must match; over 8 h asks to confirm (`CONFIRM_HOURS_ABOVE`)), 0 for no-show, `markedBy` = writer. Moving someone off "accepted" deletes their mark (`setApplicationStatus`). Event/role names are copied in, so hours survive event deletion. `VolunteerHoursCard` (`src/components/VolunteerHours.js`) shows total hours, events and entries on Profile (own, plus no-shows) and ApplicantProfile/UserProfile (others, only if they have hours).
- Public Events/Jobs tabs are read-only; all event management lives in the Admin/My events tab (Events section → ManageEvent → JobApplicants / ContentEdit).
- Role categories (pick-list): `ROLE_CATEGORIES` in `src/config.js`. Organizer roles are sorted first and highlighted (`sortRoles`).
- `src/config.js` — `VERIFICATION_CONTACT` (where orgs send the code), org types.
- Logo: `assets/logo.png` (placeholder copy of icon.png — replace with the real logo).

## Structure

- `App.js` — auth gate + tabs (each a stack): Jobs, Events, Leagues, Chat (ChatHome → ChatRoom / NewGroup / AddFriend), Profile (→ ResubmitOrg), Admin (staff + organizers: AdminHome → ManageEvent / OrgReview / ContentEdit / AddTeamMember).
- `src/admin/api.js` — org review, team (owners/admins/testers), content save/delete. `src/admin/contentSchemas.js` — editor field definitions for jobs/events/leagues.
- `src/components/OrgFields.js` — shared organization details form + validation.
- `src/firebase.js` — app/db/auth init from `EXPO_PUBLIC_FIREBASE_*` env vars (`.env.local` locally, `eas.json` for builds). All null when unconfigured.
- `src/auth/AuthContext.js` — `useAuth()`: user, profile (`users/{uid}`), signIn/signUp/signOut/updateProfile.
- `src/data/DataContext.js` — `useData()`: live `leagues`, `events`, `jobs`; falls back to `src/data/sample.js`.
- `src/chat/api.js` — friendships, chats, messages: hooks + write helpers.
- `src/components/ui.js` — Button, Segmented, Avatar, SignInPrompt. `src/theme.js` — colors, shared styles.
- Light/dark theme (Profile → ⚙ Settings) switches live. `colors`/`common` are proxies for the current theme. Write style sheets as `const styles = themed((colors) => StyleSheet.create({...}))` and never put `colors.x` in a plain module-level constant (use a getter or read it inside the component). App.js remounts the NavigationContainer (keyed by theme, nav state kept) on change.

## Data model (Firestore)

- `leagues/{id}`: name, fullName, university, faculty, description, website, verified, orgUid (claiming organization, optional)
- `events/{id}`: title, leagueId (optional), date (YYYY-MM-DD), time, location, category, description, createdBy, organizerName
- `jobs/{id}`: title, event, eventId, leagueId, date, location, spots, hours, category, description, requirements[], perks[], createdBy, acceptedCount
- Account deletion: Settings → Delete my account (`src/auth/deleteAccount.js`). If you add a new per-user collection, delete it there too.
- `jobs/{id}/applications/{uid}`: uid, name, age, status pending|accepted|declined, appliedAt, reviewedBy, reviewedAt. Personal accounts only; applicants read their own, event creator/staff manage (`src/applications/api.js`, Admin → event → role → JobApplicants).
- `users/{uid}`: displayName (real name; used in chats, applications, search), nickname (optional, shown under the photo on Profile), displayNameLower (for search), accountType, orgStatus (orgs), (birth date is NOT here — it's private in `users/{uid}/private/profile` { birthDate } (YYYY-MM-DD, 16+, set once, readable by self + staff; `useAuth().birthDate`). Organizers see age via `applications.age`, which rules verify against it), country, county, city (picked from `src/data/romania.js` via `PlaceFields`/`SelectField` in ui.js; shown with `formatPlace`), faculty, bio, leagueId, photo (512px JPEG data URI, ~50–90 KB; a 1080px copy lives in `users/{uid}/photo/full` { data }, loaded only by `PhotoViewer` — no Firebase Storage; see `src/profile/photo.js`)
- `orgApplications/{uid}`: orgName, orgType, university, faculty, leagueId, website, socialUrl, contactName, contactRole, phone, notes, contactEmail, verificationCode, status, emailVerified, rejectReason, reviewedBy, reviewedAt
- `owners/{uid}`, `admins/{uid}`, `testers/{uid}`: displayName, addedBy, addedAt
- `attendance/{jobId_uid}`: uid, jobId, eventId, attended, hours, eventTitle, roleTitle, date, orgName, markedBy, markedAt (verified hours; deleted on account deletion)
- `eventHelpers/{eventId_uid}`: eventId, uid, name, jobId — written by `setApplicationStatus` / `withdrawApplication` (`src/applications/api.js`)
- `friendships/{uidA_uidB}` (sorted): members[2], memberNames{}, requestedBy, status pending|accepted
- `chats/{id}`: type direct|group|event|team, name, photo, description, createdBy, members[], memberNames{}, lastMessage, lastSender, updatedAt; event chats also eventId, memberRoles{}, removed{}. Direct chat id: `dm_<uidA_uidB>`, event chat id: `event_<eventId>`.
- `chats/{id}/messages/{id}`: text, senderId, senderName, createdAt

Security rules: `firestore.rules` (deploy with `npx firebase-tools deploy --only firestore:rules`). Public collections are writable only by staff (owners + admins + testers). Roles are enforced there, not just in the UI.
Avoid queries needing composite indexes — sort client-side.

## Commands

- `npx expo start` — dev server; scan QR with Expo Go.
- `npx expo install <pkg>` — always use for adding packages.
- `npx expo-doctor` — check dependency health.
- `npm run seed` — upload sample data (only works while Firestore is in test mode).
- `npm run test-students` (`-- 10` for more, `-- --delete` to remove them) — fake student accounts (`@volunteen.test`, ages 16–23) that apply to 2–3 open roles each. Logins go to `scripts/test-students.local.json` (git-ignored) — never print or commit them.
- `npx eas-cli build --platform android --profile preview` — shareable APK (Expo account: dvmi).

## Conventions

- Default branch: `main`. License: MIT.
- Node may need PATH refreshed in this shell (installed after session start).
