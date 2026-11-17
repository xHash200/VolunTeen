import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
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

export function useOwners() {
  const [items, setItems] = useState([]);
  useEffect(
    () =>
      onSnapshot(
        collection(db, "owners"),
        (snap) => setItems(snap.docs.map((d) => ({ uid: d.id, ...d.data() }))),
        (err) => console.warn("Owners error:", err.message)
      ),
    []
  );
  return items;
}

export const addOwner = (target, me) =>
  setDoc(doc(db, "owners", target.id), {
    displayName: target.displayName ?? "",
    addedBy: me,
    addedAt: serverTimestamp(),
  });

export const removeOwner = (uid) => deleteDoc(doc(db, "owners", uid));
