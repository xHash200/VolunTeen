import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

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

async function reviewOrg(uid, reviewerUid, status, rejectReason = "") {
  const batch = writeBatch(db);
  batch.update(doc(db, "orgApplications", uid), {
    status,
    rejectReason,
    reviewedBy: reviewerUid,
    reviewedAt: serverTimestamp(),
  });
  batch.update(doc(db, "users", uid), { orgStatus: status, updatedAt: serverTimestamp() });
  await batch.commit();
}

export const approveOrg = (uid, reviewerUid) => reviewOrg(uid, reviewerUid, "verified");
export const rejectOrg = (uid, reviewerUid, reason) => reviewOrg(uid, reviewerUid, "rejected", reason.trim());

// ---------- Team (owners + testers) ----------

export const ROLES = {
  owners: { label: "Owner", plural: "Owners" },
  testers: { label: "Tester", plural: "Testers" },
  organizers: { label: "Organizer", plural: "Organizers" },
};

// role: "owners" | "testers" | "organizers" (the Firestore collection name)
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
