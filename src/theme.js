import { createContext, createElement, useContext, useEffect, useState } from "react";
import { Appearance, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";

// ---------------------------------------------------------------------------------------------
// Live theme. `colors`, `common` and every `themed(...)` style sheet are proxies that always return
// the CURRENT theme's values, so code can keep writing `colors.card` / `styles.box` as before.
// Rules for new code:
//   • Build style sheets with `const styles = themed((colors) => StyleSheet.create({...}))`
//     — never a plain module-level StyleSheet/object that reads `colors` (it would freeze one theme).
//   • Read colors at render time (inside components), not in module-level constants.
// ThemeProvider re-renders the app when the theme changes (App.js remounts the screens, keeping
// the navigation state, so you stay where you were).
// ---------------------------------------------------------------------------------------------

const THEME_KEY = "themePreference"; // "light" | "dark" | "system"
const readPreference = () => {
  try {
    return SecureStore.getItem(THEME_KEY) || "system";
  } catch {
    return "system";
  }
};

const light = {
  bg: "#f6f7fb",
  card: "#ffffff",
  text: "#1d2433",
  muted: "#6b7385",
  accent: "#2f6fed",
  accentSoft: "#e8efff",
  border: "#e3e6ee",
  warnBg: "#fff4e0",
  warnText: "#9a6200",
  warnBorder: "#f3d9a6",
  okBg: "#e5f6ec",
  okBorder: "#bfe5cd",
  badBg: "#fdecec",
  badBorder: "#f5c6c6",
};

const dark = {
  bg: "#0f1217",
  card: "#1a1f27",
  text: "#e8ebf1",
  muted: "#9aa3b5",
  accent: "#5b8def",
  accentSoft: "#1f2d4a",
  border: "#2b3240",
  warnBg: "#3a2e14",
  warnText: "#f2c46b",
  warnBorder: "#5c4720",
  okBg: "#15301f",
  okBorder: "#24543a",
  badBg: "#3a1b1b",
  badBorder: "#5e2a2a",
};

const resolve = (pref, system) => (pref === "dark" || (pref === "system" && system === "dark") ? "dark" : "light");
let preference = readPreference();
let mode = resolve(preference, Appearance.getColorScheme());
const palettes = { light, dark };

// Always-current palette.
export const colors = new Proxy({}, { get: (_, key) => palettes[mode][key] });
export const isDarkMode = () => mode === "dark";

// A style sheet rebuilt (once, then cached) for each theme. Accessing `styles.x` gives the current theme's style.
export function themed(build) {
  const cache = {};
  const current = () => (cache[mode] ??= build(palettes[mode]));
  return new Proxy({}, { get: (_, key) => current()[key], ownKeys: () => Reflect.ownKeys(current()), getOwnPropertyDescriptor: (_, key) => ({ ...Object.getOwnPropertyDescriptor(current(), key), configurable: true }) });
}

const listeners = new Set();
function apply(nextPref) {
  preference = nextPref;
  const nextMode = resolve(preference, Appearance.getColorScheme());
  mode = nextMode;
  listeners.forEach((l) => l());
}
// Follow the phone's setting live while on "Same as phone".
Appearance.addChangeListener(() => {
  if (preference === "system") apply("system");
});

export async function setThemePreference(value) {
  apply(value);
  try {
    await SecureStore.setItemAsync(THEME_KEY, value);
  } catch (e) {
    console.warn("Couldn't save theme:", e.message);
  }
}

const ThemeContext = createContext({ mode, preference });
export function ThemeProvider({ children }) {
  const [state, setState] = useState({ mode, preference });
  useEffect(() => {
    const l = () => setState({ mode, preference });
    listeners.add(l);
    return () => listeners.delete(l);
  }, []);
  return createElement(ThemeContext.Provider, { value: state }, children);
}
// { mode: "light"|"dark", preference: "light"|"dark"|"system" } — components using it re-render on change.
export const useTheme = () => useContext(ThemeContext);

export const formatDate = (d) => {
  const date = new Date(d);
  return isNaN(date) ? String(d) : date.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
};

// Dates are stored as ISO "YYYY-MM-DD" (sorts correctly) but typed/shown European style "DD.MM.YYYY".
export const isoToEu = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso ?? "";
};

// Accepts 5.12.2026, 05/12/2026, 05-12-2026. Returns ISO string, or null if it isn't a real date.
export const euToIso = (eu) => {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec((eu ?? "").trim());
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

// Whole years since an ISO birth date ("YYYY-MM-DD").
export const ageFrom = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return null;
  const now = new Date();
  const [, y, mo, d] = m.map(Number);
  return now.getFullYear() - y - (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d) ? 1 : 0);
};

// Formats digits as DD.MM.YYYY while typing.
export const maskEuDate = (text) => {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join(".");
};

export const common = themed((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  title: { fontSize: 17, fontWeight: "600", color: colors.text },
  meta: { fontSize: 14, color: colors.muted },
  body: { fontSize: 15, color: colors.text, lineHeight: 21 },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  empty: { textAlign: "center", color: colors.muted, marginTop: 32 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
}));
