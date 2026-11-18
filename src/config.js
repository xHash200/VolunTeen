// App-wide settings you can change.

// Where organizations send their verification code from their official page/email.
// Example: "Instagram @volunteen.app or volunteen.app@gmail.com". Leave empty to show a generic message.
export const VERIFICATION_CONTACT = "";

// Categories for an event's volunteer roles. People accepted into an "Organizer" role become
// event helpers: they can accept/decline applicants for that event's other roles.
export const ORGANIZER_CATEGORY = "Organizer";
export const ROLE_CATEGORIES = [ORGANIZER_CATEGORY, "Logistics", "Tehnic", "Media / PR", "Event support", "Other"];

export const ORG_TYPES =["Student league", "Student organization", "NGO", "Other"];
