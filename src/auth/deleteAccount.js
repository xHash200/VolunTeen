import {
  arrayRemove,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential } from "firebase/auth";
import { auth, db } from "../firebase";
import { withdrawApplication } from "../applications/api";
import { forgetAccount } from "./savedAccounts";

// Permanently deletes the signed-in user's account and personal data.
// `jobs` = all jobs (from useData) — used to find the person's applications.
// Kept on purpose: chat messages they sent (part of other people's conversations, shown with their old name)
// and events/roles an organization created (public content; staff can remove them).
export async function deleteMyAccount({ password, jobs, onStep = () => {} }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const uid = user.uid;

  // 1. Confirm it's really them (Firebase also requires a recent sign-in to delete an account).
  onStep("Checking your password…");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));

  // 2. Applications (frees accepted spots and any event-Organizer access).
  onStep("Removing your applications…");
  for (const job of jobs) {
    const ref = doc(db, "jobs", String(job.id), "applications", uid);
    const snap = await getDoc(ref).catch(() => null);
    if (snap?.exists()) await withdrawApplication(job, uid, snap.data().status === "accepted");
  }
  const helperDocs = await getDocs(query(collection(db, "eventHelpers"), where("uid", "==", uid)));
  await Promise.all(helperDocs.docs.map((d) => deleteDoc(d.ref)));

  // 3. Friends.
  onStep("Removing friends…");
  const friendships = await getDocs(query(collection(db, "friendships"), where("members", "array-contains", uid)));
  await Promise.all(friendships.docs.map((d) => deleteDoc(d.ref)));

  // 4. Leave chats (messages stay in the other people's conversations).
  onStep("Leaving chats…");
  const chats = await getDocs(query(collection(db, "chats"), where("members", "array-contains", uid)));
  await Promise.all(
    chats.docs.map((d) => updateDoc(d.ref, { members: arrayRemove(uid), [`memberNames.${uid}`]: deleteField() }))
  );

  // 5. Profile (public + private) and organization request.
  onStep("Deleting your profile…");
  await deleteDoc(doc(db, "users", uid, "private", "profile")).catch(() => {});
  await deleteDoc(doc(db, "users", uid, "photo", "full")).catch(() => {});
  await deleteDoc(doc(db, "orgApplications", uid)).catch(() => {});
  await deleteDoc(doc(db, "users", uid));

  // 6. The sign-in itself, and the saved login on this phone.
  onStep("Deleting your login…");
  await forgetAccount(uid).catch(() => {});
  await deleteUser(user);
}
