import { StyleSheet } from "react-native";

export const colors = {
  bg: "#f6f7fb",
  card: "#ffffff",
  text: "#1d2433",
  muted: "#6b7385",
  accent: "#2f6fed",
  accentSoft: "#e8efff",
  border: "#e3e6ee",
  warnBg: "#fff4e0",
  warnText: "#9a6200",
};

export const formatDate = (d) => {
  const date = new Date(d);
  return isNaN(date) ? String(d) : date.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
};

export const common = StyleSheet.create({
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
});
