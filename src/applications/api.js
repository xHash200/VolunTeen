import { useEffect, useState } from "react";
import { collection, doc, increment, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

// Firestore layout:
//   jobs/{jobId}/applications/{uid}  { uid, name, status: pending|accepted|declined, appliedAt, reviewedBy, reviewedAt }
//   jobs/{jobId}.acceptedCount       number of accepted volunteers (public, used for "spots left")

const appRef = (jobId, uid) => doc(db, "jobs", String(jobId), "applications", uid);
const jobRef = (jobId) => doc(db, "jobs", String(jobId));
const millis = (ts) => ts?.toMillis?.() ?? Date.now();

// The signed-in user's own application for a job. undefined = loading, null = none.
export function useMyApplication(jobId, uid) {
  const [app, setApp] = useState(undefined);
  useEffect(() => {
    if (!db || !uid || jobId == null) {
      setApp(null);
      return;
    }
    return onSnapshot(
      appRef(jobId, uid),
      (snap) => setApp(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (err) => {
        console.warn("Application query error:", err.message);
        setApp(null);
      }
    );
  }, [jobId, uid]);
  return app;
}

// All applications for a job, oldest first (waiting-list order). Organizers/staff only.
export function useJobApplications(jobId) {
  const [items, setItems] = useState(undefined);
  useEffect(() => {
    if (!db || jobId == null) {
      setItems([]);
      return;
    }
    return onSnapshot(
      collection(db, "jobs", String(jobId), "applications"),
      (snap) =>
        setItems(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => millis(a.appliedAt) - millis(b.appliedAt))
        ),
      (err) => {
        console.warn("Applications query error:", err.message);
        setItems([]);
      }
    );
  }, [jobId]);
  return items;
}

export const applyToJob = (jobId, uid, name) =>
  setDoc(appRef(jobId, uid), { uid, name: name || "Volunteer", status: "pending", appliedAt: serverTimestamp() });

// Withdraw. If the volunteer was accepted, their spot is freed in the same write.
export async function withdrawApplication(jobId, uid, wasAccepted) {
  const batch = writeBatch(db);
  batch.delete(appRef(jobId, uid));
  if (wasAccepted) batch.update(jobRef(jobId), { acceptedCount: increment(-1) });
  await batch.commit();
}

// Organizer decision. Keeps jobs/{jobId}.acceptedCount in step with accepted applications.
export async function setApplicationStatus(jobId, app, status, reviewerUid) {
  const batch = writeBatch(db);
  batch.update(appRef(jobId, app.id), { status, reviewedBy: reviewerUid, reviewedAt: serverTimestamp() });
  const delta = (status === "accepted" ? 1 : 0) - (app.status === "accepted" ? 1 : 0);
  if (delta) batch.update(jobRef(jobId), { acceptedCount: increment(delta) });
  await batch.commit();
}

// Self-heal the public counter from the real list (organizer view).
export const syncAcceptedCount = (jobId, count) => setDoc(jobRef(jobId), { acceptedCount: count }, { merge: true });
