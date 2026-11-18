import { useEffect, useState } from "react";
import { Text } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Clan-style tag shown before a name: [OWN] owner, [ADM] admin, [QA] tester, [ORG] verified organization.
// Only the highest one is shown (an owner who is also a tester shows [OWN]).
export const TAGS = {
  owner: { text: "OWN", color: "#d62828" },
  admin: { text: "ADM", color: "#e85d04" },
  tester: { text: "QA", color: "#c9a000" },
  organization: { text: "ORG", color: "#7b2cbf" },
};

export const tagFor = ({ isOwner, isAdmin, isTester, isVerifiedOrg }) =>
  isOwner ? "owner" : isAdmin ? "admin" : isTester ? "tester" : isVerifiedOrg ? "organization" : null;

export function RoleTag({ kind, style }) {
  const t = TAGS[kind];
  if (!t) return null;
  return <Text style={[{ color: t.color, fontWeight: "800" }, style]}>[{t.text}] </Text>;
}

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
