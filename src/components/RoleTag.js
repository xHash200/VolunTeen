import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Role tag shown before a name: OWN owner, ADM admin, QA tester, ORG verified organization.
// Only the highest one is shown (an owner who is also a tester shows OWN).
// It's drawn as a filled colored pill, not as text, so nobody can fake one by typing "[OWN]" into a
// name or a message: typed text never gets the pill. Put it next to the name in a row (NameWithTag).
export const TAGS = {
  owner: { text: "OWN", label: "Owner", color: "#d62828", fg: "#fff" },
  admin: { text: "ADM", label: "Admin", color: "#e85d04", fg: "#fff" },
  tester: { text: "QA", label: "Tester", color: "#c9a000", fg: "#1a1a1a" },
  organization: { text: "ORG", label: "Organization", color: "#7b2cbf", fg: "#fff" },
};

export const tagFor = ({ isOwner, isAdmin, isTester, isVerifiedOrg }) =>
  isOwner ? "owner" : isAdmin ? "admin" : isTester ? "tester" : isVerifiedOrg ? "organization" : null;

export function RoleTag({ kind, small, style }) {
  const t = TAGS[kind];
  if (!t) return null;
  return (
    <View style={[styles.pill, small && styles.pillSmall, { backgroundColor: t.color }, style]} accessibilityLabel={t.label}>
      <Text style={[styles.pillText, small && styles.pillTextSmall, { color: t.fg }]}>{t.text}</Text>
    </View>
  );
}

// "[pill] Name" in one row. `textStyle` styles the name; extra children (e.g. " (you)") follow it.
export function NameWithTag({ kind, name, textStyle, small, style, children, numberOfLines = 1 }) {
  return (
    <View style={[styles.row, style]}>
      <RoleTag kind={kind} small={small} />
      <Text style={[textStyle, { flexShrink: 1 }]} numberOfLines={numberOfLines}>
        {name}
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 0 },
  pill: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  pillSmall: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  pillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  pillTextSmall: { fontSize: 9 },
});

// Looks up another person's tag (owners/admins/testers lists are readable by signed-in users; org status is on the profile).
const cache = new Map();
export function useRoleTagOf(uid, profile) {
  const [kind, setKind] = useState(() => cache.get(uid) ?? null);
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    Promise.all([getDoc(doc(db, "owners", uid)), getDoc(doc(db, "admins", uid)), getDoc(doc(db, "testers", uid))])
      .then(([o, a, t]) => {
        const k = tagFor({
          isOwner: o.exists(),
          isAdmin: a.exists(),
          isTester: t.exists(),
          isVerifiedOrg: profile?.accountType === "organization" && profile?.orgStatus === "verified",
        });
        cache.set(uid, k);
        if (alive) setKind(k);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uid, profile?.accountType, profile?.orgStatus]);
  return kind;
}
