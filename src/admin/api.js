import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { STUDENT_LEAGUE } from "../config";

const millis = (ts) => ts?.toMillis?.() ?? Date.now();

export function useApplications(status) {
  const [items, setItems] = useState([]);
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "orgApplications"), where("status", "==", status)),
        (snap) =>
          setItems(
            snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => millis(b.submittedAt) - millis(a.submittedAt))
          ),
        (err) => console.warn("Applications error:", err.message)
      ),
    [status]
  );
  return items;
}

export function useApplication(uid) {
  const [app, setApp] = useState(undefined);
  useEffect(
    () =>
      onSnapshot(
        doc(db, "orgApplications", uid),
        (snap) => setApp(snap.exists() ? { uid: snap.id, ...snap.data() } : null),
        (err) => console.warn("Application error:", err.message)
      ),
    [uid]
  );
  return app;
}

// ---------- League claiming ----------
// A verified organization of type "Student league" that picked a league at sign-up "claims" it:
// leagues/{id}.orgUid = its uid. The league then shows as verified and "Managed by" that account, and
// the organization isn't listed a second time under Verified organizations. One account per league.

// Which league (if any) this application would claim, and whether it's free.
// `leagueById` from useData. Returns { league, state: "none" | "free" | "mine" | "taken" }.
export function claimFor(app, leagueById) {
  const league = app?.orgType === STUDENT_LEAGUE ? leagueById?.[app.leagueId] : null;
  if (!league) return { league: null, state: "none" };
  if (!league.orgUid) return { league, state: "free" };
  return { league, state: league.orgUid === app.uid ? "mine" : "taken" };
}

async function reviewOrg(uid, reviewerUid, status, rejectReason = "", claimLeagueId = null) {
  const batch = writeBatch(db);
  batch.update(doc(db, "orgApplications", uid), {
    status,
    rejectReason,
    reviewedBy: reviewerUid,
    reviewedAt: serverTimestamp(),
  });
  batch.update(doc(db, "users", uid), { orgStatus: status, updatedAt: serverTimestamp() });
  // Drop any league this account held before (rejected/revoked, or it now claims a different one), then claim.
  const held = await getDocs(query(collection(db, "leagues"), where("orgUid", "==", uid)));
  for (const d of held.docs) if (d.id !== claimLeagueId) batch.update(d.ref, { orgUid: deleteField() });
  if (claimLeagueId) batch.update(doc(db, "leagues", claimLeagueId), { orgUid: uid });
  await batch.commit();
}

// `claimLeagueId`: the league to link (only when claimFor(...) says "free" or "mine").
export const approveOrg = (uid, reviewerUid, claimLeagueId = null) => reviewOrg(uid, reviewerUid, "verified", "", claimLeagueId);
export const rejectOrg = (uid, reviewerUid, reason) => reviewOrg(uid, reviewerUid, "rejected", reason.trim());
// Staff: link a league to an already-verified organization (approved before claiming existed).
export const claimLeague = (leagueId, orgUid) => updateDoc(doc(db, "leagues", leagueId), { orgUid });
// Staff: unlink a league from its organization (e.g. claimed by mistake).
export const unclaimLeague = (leagueId) => updateDoc(doc(db, "leagues", leagueId), { orgUid: deleteField() });

// ---------- Team (owners + admins + testers) ----------

export const ROLES = {
  owners: { label: "Owner", plural: "Owners" },
  admins: { label: "Admin", plural: "Admins" },
  testers: { label: "Tester", plural: "Testers" },
};

// role: "owners" | "admins" | "testers" (the Firestore collection name)
export function useTeam(role) {
  const [items, setItems] = useState([]);
  useEffect(
    () =>
      onSnapshot(
        collection(db, role),
        (snap) =>
          setItems(
            snap.docs.map((d) => {
              const data = d.data();
              // Accept "DisplayName" too, in case it was typed that way in the Firebase console.
              return { uid: d.id, ...data, displayName: data.displayName ?? data.DisplayName ?? "" };
            })
          ),
        (err) => console.warn(`${role} error:`, err.message)
      ),
    [role]
  );
  return items;
}

export const addTeamMember = (role, target, me) =>
  setDoc(doc(db, role, target.id), {
    displayName: target.displayName ?? "",
    addedBy: me,
    addedAt: serverTimestamp(),
  });

export const removeTeamMember = (role, uid) => deleteDoc(doc(db, role, uid));

// ---------- Content (jobs / events / leagues) ----------

// `creator` ({ uid, name }) is recorded on new items; organizers may only edit items they created.
export async function saveContent(collectionName, id, data, creator) {
  const payload = { ...data, updatedAt: serverTimestamp() };
  if (id) {
    await setDoc(doc(db, collectionName, id), payload, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, collectionName), {
    ...payload,
    createdBy: creator.uid,
    ...(collectionName === "events" ? { organizerName: creator.name } : {}),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export const deleteContent = (collectionName, id) => deleteDoc(doc(db, collectionName, id));

// Deletes an event together with all of its volunteer roles.
export async function deleteEventWithRoles(eventId, jobIds) {
  const batch = writeBatch(db);
  jobIds.forEach((jobId) => batch.delete(doc(db, "jobs", String(jobId))));
  batch.delete(doc(db, "events", eventId));
  await batch.commit();
}
