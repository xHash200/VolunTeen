import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";

// Verified volunteer hours.
//   attendance/{jobId_uid} { uid, jobId, eventId, attended: bool, hours: number (0 if no-show),
//                            eventTitle, roleTitle, date, orgName, markedBy, markedAt }
// Written by whoever manages the role's applicants (event's organization, staff, event helpers for
// non-Organizer roles), only for accepted volunteers, from the event day on. Event/role names are copied
// so the volunteer keeps their hours even if the event is deleted later. Rules: firestore.rules.

const attendanceRef = (jobId, uid) => doc(db, "attendance", `${jobId}_${uid}`);

// "09:00–14:00" → 5, "18:00-23:30" → 5.5, overnight "22:00–02:00" → 4. null if it can't be read.
export function hoursFromRange(range) {
  const m = String(range ?? "").match(/(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  let mins = Number(m[3]) * 60 + Number(m[4]) - (Number(m[1]) * 60 + Number(m[2]));
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 2) / 2;
}

// Local "YYYY-MM-DD".
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Attendance can be marked from the event day on (no date = any time).
export const attendanceOpen = (date) => !date || date <= todayISO();

// Per role. Keep MAX_HOURS in sync with firestore.rules (attendance → validAttendance).
export const MAX_HOURS = 250;
// More than this (a full working day) asks the organizer to confirm, in case of a typo.
export const CONFIRM_HOURS_ABOVE = 8;
// Parses what the organizer typed ("5", "4,5"). Returns a number in (0, MAX_HOURS] or null.
export function parseHours(text) {
  const n = Number(String(text ?? "").replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 && n <= MAX_HOURS ? Math.round(n * 4) / 4 : null;
}

function useAttendanceQuery(field, value) {
  const [items, setItems] = useState(undefined);
  useEffect(() => {
    if (!db || !value) {
      setItems([]);
      return;
    }
    return onSnapshot(
      query(collection(db, "attendance"), where(field, "==", String(value))),
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => {
        console.warn("Attendance query error:", err.message);
        setItems([]);
      }
    );
  }, [field, value]);
  return items;
}

// { [uid]: record } for one role (organizer view).
export function useJobAttendance(jobId) {
  const items = useAttendanceQuery("jobId", jobId);
  return items && Object.fromEntries(items.map((a) => [a.uid, a]));
}

// A volunteer's record: confirmed entries (newest first), total hours, events and no-shows.
export function useVolunteerHours(uid) {
  const items = useAttendanceQuery("uid", uid);
  if (!items) return undefined;
  const attended = items.filter((a) => a.attended).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return {
    entries: attended,
    totalHours: attended.reduce((s, a) => s + (Number(a.hours) || 0), 0),
    events: new Set(attended.map((a) => a.eventId || a.jobId)).size,
    noShows: items.length - attended.length,
  };
}

// attended = true with hours, or false (no-show, hours 0). Overwrites an earlier mark.
export const markAttendance = ({ job, event, app, attended, hours, markerUid }) =>
  setDoc(attendanceRef(job.id, app.id), {
    uid: app.id,
    jobId: String(job.id),
    eventId: job.eventId ?? "",
    attended,
    hours: attended ? hours : 0,
    eventTitle: event?.title || job.event || "",
    roleTitle: job.title ?? "",
    date: job.date || event?.date || "",
    orgName: event?.organizerName ?? "",
    markedBy: markerUid,
    markedAt: serverTimestamp(),
  });

export const clearAttendance = (jobId, uid) => deleteDoc(attendanceRef(jobId, uid));

export { attendanceRef };
