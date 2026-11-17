// Uploads sample leagues and jobs to Firestore.
// Usage: node --env-file=.env.local scripts/seed.mjs
import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";
import { LEAGUES, JOBS } from "../src/data/sample.js";

const env = (k) => process.env[`EXPO_PUBLIC_FIREBASE_${k}`];
const app = initializeApp({
  apiKey: env("API_KEY"),
  authDomain: env("AUTH_DOMAIN"),
  projectId: env("PROJECT_ID"),
  storageBucket: env("STORAGE_BUCKET"),
  messagingSenderId: env("MESSAGING_SENDER_ID"),
  appId: env("APP_ID"),
});
const db = getFirestore(app);

const batch = writeBatch(db);
for (const { id, ...data } of LEAGUES) batch.set(doc(db, "leagues", id), data);
for (const { id, ...data } of JOBS) batch.set(doc(db, "jobs", `job-${id}`), data);
await batch.commit();

console.log(`Seeded ${LEAGUES.length} leagues and ${JOBS.length} jobs into ${env("PROJECT_ID")}.`);
process.exit(0);
