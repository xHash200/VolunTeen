import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase";

// Account types:
//   personal      — normal person (users/{uid}.accountType = "personal", or missing for old accounts)
//   organization  — users/{uid}.accountType = "organization", orgStatus pending|verified|rejected,
//                   details in orgApplications/{uid}
//   owner         — any account with a doc at owners/{uid} (added by another owner or in the Firebase console)
//   tester        — any account with a doc at testers/{uid} (added by an owner). Can review organizations
//                   and edit content, but can't manage owners/testers.
//   organizer     — doc at organizers/{uid} (added by an owner) OR a verified organization. Can create
//                   events and manage volunteer roles for events they created.

const AuthContext = createContext(null);

const lower = (s) => s.trim().toLowerCase();

function makeVerificationCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `VT-${code}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [profile, setProfile] = useState(null);
  const [application, setApplication] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isTester, setIsTester] = useState(false);
  const [hasOrganizerRole, setHasOrganizerRole] = useState(false);
  const [initializing, setInitializing] = useState(Boolean(auth));
  // True while a sign-up is writing its own profile, so we don't create a default one at the same time.
  const signingUp = useRef(false);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setEmailVerified(Boolean(u?.emailVerified));
      setInitializing(false);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsOwner(false);
      setIsTester(false);
      setHasOrganizerRole(false);
      return;
    }
    const unsubProfile = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) return setProfile({ id: snap.id, ...snap.data() });
        setProfile(null);
        // Accounts created outside the app (e.g. Firebase console → Authentication → Add user)
        // have no profile yet — create a personal one so they show up in search.
        if (!snap.metadata.fromCache && !signingUp.current) {
          const name = user.displayName || user.email?.split("@")[0] || "New user";
          setDoc(doc(db, "users", user.uid), {
            displayName: name,
            displayNameLower: lower(name),
            accountType: "personal",
            faculty: "",
            bio: "",
            leagueId: "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch((err) => console.warn("Couldn't create profile:", err.message));
        }
      },
      (err) => console.warn("Profile error:", err.message)
    );
    const unsubOwner = onSnapshot(
      doc(db, "owners", user.uid),
      (snap) => setIsOwner(snap.exists()),
      () => setIsOwner(false)
    );
    const unsubTester = onSnapshot(
      doc(db, "testers", user.uid),
      (snap) => setIsTester(snap.exists()),
      () => setIsTester(false)
    );
    const unsubOrganizer = onSnapshot(
      doc(db, "organizers", user.uid),
      (snap) => setHasOrganizerRole(snap.exists()),
      () => setHasOrganizerRole(false)
    );
    return () => {
      unsubProfile();
      unsubOwner();
      unsubTester();
      unsubOrganizer();
    };
  }, [user]);

  const accountType = profile?.accountType ?? "personal";

  useEffect(() => {
    if (!user || accountType !== "organization") {
      setApplication(null);
      return;
    }
    return onSnapshot(
      doc(db, "orgApplications", user.uid),
      (snap) => setApplication(snap.exists() ? snap.data() : null),
      (err) => console.warn("Application error:", err.message)
    );
  }, [user, accountType]);

  const withSigningUp = (fn) => async (...args) => {
    signingUp.current = true;
    try {
      return await fn(...args);
    } finally {
      signingUp.current = false;
    }
  };

  const signUpPersonal = withSigningUp(async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(doc(db, "users", cred.user.uid), {
      displayName: name.trim(),
      displayNameLower: lower(name),
      accountType: "personal",
      faculty: "",
      bio: "",
      leagueId: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    sendEmailVerification(cred.user).catch(() => {});
  });

  const signUpOrganization = withSigningUp(async (email, password, org) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const uid = cred.user.uid;
    const batch = writeBatch(db);
    batch.set(doc(db, "users", uid), {
      displayName: org.orgName.trim(),
      displayNameLower: lower(org.orgName),
      accountType: "organization",
      orgStatus: "pending",
      faculty: org.faculty ?? "",
      bio: "",
      leagueId: org.leagueId ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "orgApplications", uid), {
      ...org,
      contactEmail: email.trim(),
      verificationCode: makeVerificationCode(),
      status: "pending",
      emailVerified: false,
      rejectReason: "",
      submittedAt: serverTimestamp(),
    });
    await batch.commit();
    sendEmailVerification(cred.user).catch(() => {});
  });

  // Re-checks whether the user clicked the verification link, and records it on the org application.
  const refreshEmailVerified = async () => {
    const current = auth.currentUser;
    if (!current) return false;
    await reload(current);
    await current.getIdToken(true); // so security rules see email_verified
    const verified = current.emailVerified;
    setEmailVerified(verified);
    if (verified && application?.status === "pending" && !application.emailVerified) {
      await setDoc(doc(db, "orgApplications", current.uid), { emailVerified: true }, { merge: true });
    }
    return verified;
  };

  const resubmitApplication = async (org) => {
    const batch = writeBatch(db);
    batch.set(
      doc(db, "orgApplications", user.uid),
      { ...org, status: "pending", rejectReason: "", emailVerified, submittedAt: serverTimestamp() },
      { merge: true }
    );
    batch.set(
      doc(db, "users", user.uid),
      { orgStatus: "pending", displayName: org.orgName.trim(), displayNameLower: lower(org.orgName), updatedAt: serverTimestamp() },
      { merge: true }
    );
    await batch.commit();
  };

  const isStaff = isOwner || isTester;
  const isVerifiedOrg = accountType === "organization" && profile?.orgStatus === "verified";
  // Organizers create events and manage volunteer roles for their own events.
  // Verified organizations are organizers automatically; owners can also grant it (organizers/{uid}).
  const isOrganizer = hasOrganizerRole || isVerifiedOrg;

  const value = {
    user,
    profile,
    application,
    initializing,
    available: Boolean(auth),
    emailVerified,
    isOwner,
    isTester,
    // Staff = owners + testers: can review organizations and edit all jobs/events/leagues.
    isStaff,
    isOrganizer,
    canManageEvents: isStaff || isOrganizer,
    // Staff can edit any event; organizers only the ones they created.
    canEditEvent: (event) => Boolean(event) && (isStaff || (isOrganizer && event.createdBy === user?.uid)),
    accountType,
    orgStatus: profile?.orgStatus ?? null,
    isVerifiedOrg,
    displayName: profile?.displayName || user?.email?.split("@")[0] || "",
    signIn: (email, password) => signInWithEmailAndPassword(auth, email.trim(), password),
    signUpPersonal,
    signUpOrganization,
    resubmitApplication,
    refreshEmailVerified,
    resendVerificationEmail: () => sendEmailVerification(auth.currentUser),
    resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
    signOut: () => signOut(auth),
    updateProfile: (data) =>
      setDoc(
        doc(db, "users", user.uid),
        {
          ...data,
          ...(data.displayName ? { displayNameLower: lower(data.displayName) } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function authErrorMessage(err) {
  const map = {
    "auth/invalid-email": "That email address isn't valid.",
    "auth/missing-email": "Please enter your email.",
    "auth/missing-password": "Please enter your password.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "No account with that email.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/operation-not-allowed": "Email sign-in isn't enabled in Firebase yet.",
    "auth/too-many-requests": "Too many attempts. Try again in a few minutes.",
    "auth/network-request-failed": "No internet connection.",
  };
  return map[err?.code] ?? err?.message ?? "Something went wrong.";
}
