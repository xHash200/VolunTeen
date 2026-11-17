// Field definitions for the in-app content editor (owners + testers).
// Field types: text, multiline, number, date (YYYY-MM-DD), list (one item per line), bool, league, event.

export const CONTENT_TYPES = {
  jobs: {
    label: "Job",
    plural: "Jobs",
    titleKey: "title",
    subtitle: (j, { eventById }) => [eventById[j.eventId]?.title ?? j.event, j.date].filter(Boolean).join(" · "),
    fields: [
      { key: "title", label: "Job title", type: "text", required: true, placeholder: "e.g. Registration desk volunteer" },
      { key: "eventId", label: "Event", type: "event", required: true },
      { key: "category", label: "Category", type: "text", placeholder: "e.g. Event support, Logistics, Media" },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "hours", label: "Hours", type: "text", placeholder: "e.g. 09:00–14:00" },
      { key: "location", label: "Location", type: "text", placeholder: "e.g. Timișoara" },
      { key: "spots", label: "Number of spots", type: "number" },
      { key: "description", label: "Description", type: "multiline" },
      { key: "requirements", label: "Requirements (one per line)", type: "list" },
      { key: "perks", label: "Perks (one per line)", type: "list" },
    ],
  },
  events: {
    label: "Event",
    plural: "Events",
    titleKey: "title",
    subtitle: (e, { leagueById }) => [leagueById[e.leagueId]?.name, e.date].filter(Boolean).join(" · "),
    fields: [
      { key: "title", label: "Event name", type: "text", required: true },
      { key: "leagueId", label: "Organized by", type: "league", required: true },
      { key: "category", label: "Category", type: "text", placeholder: "e.g. Career, Education, Social, Charity" },
      { key: "date", label: "Date", type: "date", required: true },
      { key: "time", label: "Time", type: "text", placeholder: "e.g. 09:00–17:00" },
      { key: "location", label: "Location", type: "text", placeholder: "e.g. Timișoara" },
      { key: "description", label: "Description", type: "multiline" },
    ],
  },
  leagues: {
    label: "League",
    plural: "Leagues",
    titleKey: "name",
    subtitle: (l) => [l.university, l.verified ? "verified" : "not verified"].filter(Boolean).join(" · "),
    fields: [
      { key: "name", label: "Short name", type: "text", required: true, placeholder: "e.g. LSAC Timișoara" },
      { key: "fullName", label: "Full name", type: "text" },
      { key: "university", label: "University", type: "text", required: true },
      { key: "faculty", label: "Faculty", type: "text" },
      { key: "website", label: "Website", type: "text", placeholder: "https://…" },
      { key: "description", label: "Description", type: "multiline" },
      { key: "verified", label: "Details checked and correct", type: "bool" },
    ],
  },
};

export function emptyFor(type) {
  return Object.fromEntries(
    CONTENT_TYPES[type].fields.map((f) => [f.key, f.type === "list" ? [] : f.type === "bool" ? false : f.type === "number" ? 0 : ""])
  );
}
