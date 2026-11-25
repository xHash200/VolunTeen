import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

// Live list of verified organizations (users with accountType "organization" and orgStatus "verified"),
// sorted by name. Equality-only filters, so no composite index is needed.
export function useVerifiedOrgs() {
  const [orgs, setOrgs] = useState([]);
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "users"), where("accountType", "==", "organization"), where("orgStatus", "==", "verified"));
    return onSnapshot(
      q,
      (snap) =>
        setOrgs(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.displayName ?? "").localeCompare(b.displayName ?? ""))
        ),
      (err) => console.warn("Verified organizations:", err?.message)
    );
  }, []);
  return orgs;
}
