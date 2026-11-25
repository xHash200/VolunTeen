import { useEffect, useState } from "react";
import { collection, doc, getDoc, increment, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { ORGANIZER_CATEGORY } from "../config";
import { attendanceRef } from "../attendance/api";
import { joinEventChat, leaveEventRole } from "../chat/api";

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

// `age` is the applicant's current age (from their private birth date); rules check it's correct.
// It's how organizers see an applicant's age without the birth date being public.
export const applyToJob = (jobId, uid, name, age) =>
  setDoc(appRef(jobId, uid), {
    uid,
    name: name || "Volunteer",
    status: "pending",
    appliedAt: serverTimestamp(),
    ...(age != null ? { age } : {}),
  });

const isOrganizerRole = (job) => job?.category === ORGANIZER_CATEGORY;
// eventHelpers/{eventId_uid} { eventId, uid, name, jobId } — exists while someone is accepted into an
// "Organizer" role of that event. Lets them review the event's applicants (see firestore.rules).
const helperRef = (eventId, uid) => doc(db, "eventHelpers", `${eventId}_${uid}`);

// Withdraw. If the volunteer was accepted, their spot (and any helper access) is freed in the same write.
export async function withdrawApplication(job, uid, wasAccepted) {
  const batch = writeBatch(db);
  batch.delete(appRef(job.id, uid));
  if (wasAccepted) {
    batch.update(jobRef(job.id), { acceptedCount: increment(-1) });
    if (isOrganizerRole(job) && job.eventId) batch.delete(helperRef(job.eventId, uid));
  }
  await batch.commit();
  // Leaves the event chat unless they're still accepted in another of the event's roles.
  if (wasAccepted && job.eventId) {
    await leaveEventRole(job.eventId, String(job.id), uid).catch((e) => console.warn("Event chat update failed:", e.message));
  }
}

// Organizer decision. Keeps jobs/{jobId}.acceptedCount and event-helper access in step with accepted applications.
async function syncChatAfterDecision(job, app, delta, event) {
  if (delta > 0) {
    const ev = event ?? (await getDoc(doc(db, "events", job.eventId))).data();
    if (ev) await joinEventChat({ id: job.eventId, ...ev }, String(job.id), { id: app.id, name: app.name });
  } else {
    await leaveEventRole(job.eventId, String(job.id), app.id);
  }
}

// `event` (optional): the role's event, so the event chat can be created without another read.
export async function setApplicationStatus(job, app, status, reviewerUid, event = null) {
  const batch = writeBatch(db);
  batch.update(appRef(job.id, app.id), { status, reviewedBy: reviewerUid, reviewedAt: serverTimestamp() });
  const delta = (status === "accepted" ? 1 : 0) - (app.status === "accepted" ? 1 : 0);
  if (delta) batch.update(jobRef(job.id), { acceptedCount: increment(delta) });
  if (delta && isOrganizerRole(job) && job.eventId) {
    if (delta > 0) batch.set(helperRef(job.eventId, app.id), { eventId: job.eventId, uid: app.id, name: app.name ?? "", jobId: String(job.id) });
    else batch.delete(helperRef(job.eventId, app.id));
  }
  // No longer accepted → their attendance mark for this role goes too (only accepted volunteers have hours).
  if (delta < 0) batch.delete(attendanceRef(job.id, app.id));
  await batch.commit();
  // Event group chat: accepted volunteers are in it. Best effort — the decision above is what matters.
  if (delta && job.eventId) {
    syncChatAfterDecision(job, app, delta, event).catch((e) => console.warn("Event chat update failed:", e.message));
  }
}

// Self-heal the public counter from the real list (organizer view).
export const syncAcceptedCount = (jobId, count) => setDoc(jobRef(jobId), { acceptedCount: count }, { merge: true });
