// App-wide settings you can change.

// Where organizations send their verification code from their official page/email.
// Example: "Instagram @volunteen.app or volunteen.app@gmail.com". Leave empty to show a generic message.
export const VERIFICATION_CONTACT = "";

// Minimum age for personal accounts. Also enforced in firestore.rules (isOldEnough) — keep both in sync.
export const MIN_AGE = 16;

// Categories for an event's volunteer roles. People accepted into an "Organizer" role become
// event helpers: they can accept/decline applicants for that event's other roles.
export const ORGANIZER_CATEGORY = "Organizer";
export const ROLE_CATEGORIES = [ORGANIZER_CATEGORY, "Logistics", "Tehnic", "Media / PR", "Event support", "Other"];

// Organizations of this type claim the league they picked when they're approved (leagues.orgUid).
export const STUDENT_LEAGUE = "Student league";
export const ORG_TYPES = [STUDENT_LEAGUE, "Student organization", "NGO", "Other"];
