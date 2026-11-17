import { createContext, useContext, useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { EVENTS, JOBS, LEAGUES } from "./sample";

const DataContext = createContext(null);

// Live-subscribes to Firestore `leagues`, `events` and `jobs` collections.
// Falls back to bundled sample data when Firebase isn't configured or fails.
export function DataProvider({ children }) {
  const [leagues, setLeagues] = useState(isFirebaseConfigured ? [] : LEAGUES);
  const [events, setEvents] = useState(isFirebaseConfigured ? [] : EVENTS);
  const [jobs, setJobs] = useState(isFirebaseConfigured ? [] : JOBS);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [source, setSource] = useState(isFirebaseConfigured ? "firebase" : "sample");

  useEffect(() => {
    if (!db) return;
    const fallback = (err) => {
      console.warn("Firestore error, using sample data:", err?.message);
      setLeagues(LEAGUES);
      setEvents(EVENTS);
      setJobs(JOBS);
      setSource("sample");
      setLoading(false);
    };
    const listen = (name, setter, onLoad) =>
      onSnapshot(
        collection(db, name),
        (snap) => {
          setter(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          onLoad?.();
        },
        fallback
      );
    const unsubs = [
      listen("leagues", setLeagues),
      listen("events", setEvents),
      listen("jobs", setJobs, () => setLoading(false)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const leagueById = Object.fromEntries(leagues.map((l) => [l.id, l]));
  const eventById = Object.fromEntries(events.map((e) => [e.id, e]));

  return (
    <DataContext.Provider value={{ leagues, events, jobs, leagueById, eventById, loading, source }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
