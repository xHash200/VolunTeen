// Fake student accounts for testing applications, acceptance and verified hours.
//
//   npm run test-students            create 6 students and apply each to 2–3 open roles
//   npm run test-students -- 10      create 10 instead
//   npm run test-students -- --job <jobId>       1 student who applies only to that role (add a number for more)
//   npm run test-students -- --delete   delete every account listed in the file below
//
// Accounts are made exactly like the app's sign-up (users/{uid} + private 16+ birth date), so the
// deployed security rules apply as they would to a real person. Emails end in @volunteen.test
// (a reserved domain — no email is ever delivered). Logins are saved to
// scripts/test-students.local.json (git-ignored), never printed. To use one in the app, sign in with
// an email + password from that file (Switch account → Add another account).
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  arrayRemove,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const FILE = new URL("./test-students.local.json", import.meta.url);
const env = (k) => process.env[`EXPO_PUBLIC_FIREBASE_${k}`];
if (!env("API_KEY")) {
  console.error("Firebase isn't configured: run through `npm run test-students` so .env.local is loaded.");
  process.exit(1);
}
const app = initializeApp({
  apiKey: env("API_KEY"),
  authDomain: env("AUTH_DOMAIN"),
  projectId: env("PROJECT_ID"),
  storageBucket: env("STORAGE_BUCKET"),
  messagingSenderId: env("MESSAGING_SENDER_ID"),
  appId: env("APP_ID"),
});
const auth = getAuth(app);
const db = getFirestore(app);

const STUDENTS = [
  ["Ana Popescu", "Automatică și Calculatoare", "2007-03-14"],
  ["Mihai Ionescu", "Electronică și Telecomunicații", "2005-11-02"],
  ["Ioana Dumitrescu", "Litere, Istorie și Teologie", "2006-06-21"],
  ["Andrei Stan", "Construcții", "2004-01-30"],
  ["Elena Marin", "Economie și Administrarea Afacerilor", "2010-04-18"],
  ["Radu Georgescu", "Mecanică", "2003-05-17"],
  ["Maria Constantin", "Medicină", "2006-12-01"],
  ["Vlad Munteanu", "Arhitectură", "2005-08-25"],
  ["Sara Pop", "Psihologie", "2009-02-11"],
  ["Tudor Lazăr", "Informatică", "2004-10-05"],
];

const lower = (s) => s.trim().toLowerCase();
const slug = (s) => lower(s).normalize("NFD").replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
const password = () => randomBytes(12).toString("base64url");
// Same as firestore.rules ageMatches: full years since the birth date.
const ageOf = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  const now = new Date();
  return now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0);
};
const load = () => (existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : []);
const save = (list) => writeFileSync(FILE, JSON.stringify(list, null, 2) + "\n");
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

async function create(count, onlyJobId = null) {
  const saved = load();
  const jobs = (await getDocs(collection(db, "jobs"))).docs.map((d) => ({ id: d.id, ...d.data() }));
  const open = jobs.filter((j) => j.category !== "Organizer");
  const onlyJob = onlyJobId ? jobs.find((j) => j.id === onlyJobId) : null;
  if (onlyJobId && !onlyJob) throw new Error(`No role with id ${onlyJobId}.`);
  const run = Date.now().toString(36).slice(-4);
  // Skip names already used by earlier runs, so each test student is a different person.
  const usedNames = new Set(saved.map((a) => a.name));
  const fresh = STUDENTS.filter(([name]) => !usedNames.has(name));
  for (const [i, [name, faculty, birthDate]] of (fresh.length ? fresh : STUDENTS).slice(0, count).entries()) {
    const email = `test.${slug(name)}.${run}${i}@volunteen.test`;
    const pw = password();
    const { user } = await createUserWithEmailAndPassword(auth, email, pw);
    const batch = writeBatch(db);
    batch.set(doc(db, "users", user.uid, "private", "profile"), { birthDate });
    batch.set(doc(db, "users", user.uid), {
      displayName: name,
      displayNameLower: lower(name),
      accountType: "personal",
      country: "Romania",
      county: "Timiș",
      city: "Timișoara",
      faculty,
      bio: "Test account (scripts/test-students.mjs). Safe to delete.",
      leagueId: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    saved.push({ uid: user.uid, email, password: pw, name });
    save(saved); // after every account, so nothing is lost if a later step fails

    const picks = onlyJob ? [onlyJob] : shuffle(open).slice(0, 2 + (i % 2));
    for (const job of picks) {
      await setDoc(doc(db, "jobs", job.id, "applications", user.uid), {
        uid: user.uid,
        name,
        status: "pending",
        appliedAt: serverTimestamp(),
        age: ageOf(birthDate),
      });
    }
    console.log(`+ ${name} (${ageOf(birthDate)}) applied to: ${picks.map((j) => j.title).join(", ") || "nothing (no open roles)"}`);
    await signOut(auth);
  }
  console.log(`\nLogins saved to scripts/test-students.local.json (${saved.length} accounts in total).`);
}

// Mirrors src/auth/deleteAccount.js for each saved account.
async function removeAll() {
  const saved = load();
  if (!saved.length) return console.log("No test accounts in scripts/test-students.local.json.");
  const jobs = (await getDocs(collection(db, "jobs"))).docs.map((d) => ({ id: d.id, ...d.data() }));
  const left = [];
  for (const a of saved) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, a.email, a.password);
      const uid = user.uid;
      for (const job of jobs) {
        const ref = doc(db, "jobs", job.id, "applications", uid);
        const snap = await getDoc(ref).catch(() => null);
        if (!snap?.exists()) continue;
        const batch = writeBatch(db);
        batch.delete(ref);
        if (snap.data().status === "accepted") {
          batch.update(doc(db, "jobs", job.id), { acceptedCount: increment(-1) });
          if (job.category === "Organizer" && job.eventId) batch.delete(doc(db, "eventHelpers", `${job.eventId}_${uid}`));
        }
        await batch.commit();
      }
      const byUid = (c, field = "uid") => getDocs(query(collection(db, c), where(field, "==", uid)));
      for (const d of (await byUid("eventHelpers")).docs) await deleteDoc(d.ref);
      for (const d of (await byUid("attendance")).docs) await deleteDoc(d.ref);
      const members = (c) => getDocs(query(collection(db, c), where("members", "array-contains", uid)));
      for (const d of (await members("friendships")).docs) await deleteDoc(d.ref);
      for (const d of (await members("chats")).docs)
        await updateDoc(d.ref, { members: arrayRemove(uid), [`memberNames.${uid}`]: deleteField() });
      await deleteDoc(doc(db, "users", uid, "private", "profile")).catch(() => {});
      await deleteDoc(doc(db, "users", uid, "photo", "full")).catch(() => {});
      await deleteDoc(doc(db, "users", uid));
      await deleteUser(user);
      console.log(`- deleted ${a.name} (${a.email})`);
    } catch (e) {
      console.warn(`! couldn't delete ${a.email}: ${e.message}`);
      left.push(a);
    }
  }
  save(left);
  console.log(left.length ? `${left.length} left in the file.` : "All test accounts deleted.");
}

const args = process.argv.slice(2);
const jobFlag = args.indexOf("--job");
const onlyJobId = jobFlag >= 0 ? args[jobFlag + 1] : null;
const countArg = args.find((a, i) => /^\d+$/.test(a) && i !== jobFlag + 1);
try {
  if (args[0] === "--delete") await removeAll();
  else await create(Math.min(Math.max(Number(countArg) || (onlyJobId ? 1 : 6), 1), STUDENTS.length), onlyJobId);
} catch (e) {
  console.error("Failed:", e.message);
  process.exitCode = 1;
}
process.exit();
