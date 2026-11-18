// Brackets are reserved for role tags like [OWN] or [ADM] (see components/RoleTag.js), so names,
// nicknames and organization names can't contain any kind of bracket — [] () {} <> — or the
// symbols \ | /, nor their look-alikes (full-width ［］（）／ and similar). Nobody can fake a tag.
// firestore.rules (noBrackets) enforces the same list; keep the two in sync.
export const BLOCKED_NAME_CHARS =
  /[\[\](){}<>\\|\/［］（）｛｝＜＞＼｜／【】〔〕〖〗⟦⟧⟨⟩〈〉《》「」『』❨❩❪❫❴❵¦∣⁄∕⧸⧹]/;

// Returns an error message, or null if the name is fine. `what` = "Name", "Nickname", ...
export const nameError = (value, what = "Name") =>
  BLOCKED_NAME_CHARS.test(value ?? "") ? `${what} can't contain brackets or the symbols \\ | /.` : null;

// For names we generate ourselves (e.g. from an email address).
export const stripBlockedChars = (value) => (value ?? "").replace(new RegExp(BLOCKED_NAME_CHARS, "g"), "");
