import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { JOBS, LEAGUES } from "./sample";

const DataContext = createContext(null);

// Live-subscribes to Firestore `leagues` and `jobs` collections.
// Falls back to bundled sample data when Firebase isn't configured or fails.
export function DataProvider({ children }) {
  const [leagues, setLeagues] = useState(isFirebaseConfigured ? [] : LEAGUES);
  const [jobs, setJobs] = useState(isFirebaseConfigured ? [] : JOBS);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [source, setSource] = useState(isFirebaseConfigured ? "firebase" : "sample");

  useEffect(() => {
    if (!db) return;
    const fallback = (err) => {
      console.warn("Firestore error, using sample data:", err?.message);
      setLeagues(LEAGUES);
      setJobs(JOBS);
      setSource("sample");
      setLoading(false);
    };
    const unsubLeagues = onSnapshot(
      collection(db, "leagues"),
      (snap) => setLeagues(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      fallback
    );
    const unsubJobs = onSnapshot(
      collection(db, "jobs"),
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      fallback
    );
    return () => {
      unsubLeagues();
      unsubJobs();
    };
  }, []);

  const leagueById = Object.fromEntries(leagues.map((l) => [l.id, l]));

  return (
    <DataContext.Provider value={{ leagues, jobs, leagueById, loading, source }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
