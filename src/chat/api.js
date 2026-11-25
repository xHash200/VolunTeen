import { useEffect, useState } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

// Firestore layout:
//   friendships/{uidA_uidB}  { members[2], memberNames{}, requestedBy, status: pending|accepted }
//   chats/{id}               { type: direct|group, name?, members[], memberNames{}, lastMessage, updatedAt }
//   chats/team_owners, chats/team_staff  { type: team, name, lastMessage, lastSender, updatedAt } — no members;
//                            access comes from the role (see TEAM_CHATS + firestore.rules)
//   chats/{id}/messages/{id} { text, senderId, senderName, createdAt }

export const pairId = (a, b) => [a, b].sort().join("_");
export const directChatId = (a, b) => `dm_${pairId(a, b)}`;

const millis = (ts) => ts?.toMillis?.() ?? Date.now();

function useLiveQuery(makeQuery, deps) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const q = makeQuery();
    if (!q) {
      setItems([]);
      return;
    }
    return onSnapshot(
      q,
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.warn("Chat query error:", err.message)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return items;
}

// ---------- Friends ----------

export function useFriendships(uid) {
  const docs = useLiveQuery(
    () => uid && query(collection(db, "friendships"), where("members", "array-contains", uid)),
    [uid]
  );
  return docs.map((f) => {
    const otherId = f.members.find((m) => m !== uid);
    return {
      friendshipId: f.id,
      id: otherId,
      name: f.memberNames?.[otherId] ?? "Unknown",
      status: f.status,
      incoming: f.status === "pending" && f.requestedBy !== uid,
    };
  });
}

export async function sendFriendRequest(me, myName, other) {
  const ref = doc(db, "friendships", pairId(me, other.id));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const f = snap.data();
    // They already asked us — accept instead of creating a duplicate.
    if (f.status === "pending" && f.requestedBy !== me) await updateDoc(ref, { status: "accepted" });
    return;
  }
  await setDoc(ref, {
    members: [me, other.id],
    memberNames: { [me]: myName, [other.id]: other.displayName },
    requestedBy: me,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export const acceptFriendRequest = (friendshipId) =>
  updateDoc(doc(db, "friendships", friendshipId), { status: "accepted" });

export const removeFriendship = (friendshipId) => deleteDoc(doc(db, "friendships", friendshipId));

export async function searchUsers(text) {
  const s = text.trim().toLowerCase();
  if (!s) return [];
  const snap = await getDocs(
    query(
      collection(db, "users"),
      where("displayNameLower", ">=", s),
      where("displayNameLower", "<=", s + ""),
      limit(20)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- Chats ----------

export function useChats(uid) {
  const chats = useLiveQuery(
    () => uid && query(collection(db, "chats"), where("members", "array-contains", uid)),
    [uid]
  );
  return [...chats].sort((a, b) => millis(b.updatedAt) - millis(a.updatedAt));
}

export function useMessages(chatId) {
  return useLiveQuery(
    () => chatId && query(collection(db, "chats", chatId, "messages"), orderBy("createdAt"), limitToLast(200)),
    [chatId]
  );
}

// One chat, live. undefined = loading, null = missing or no access.
export function useChat(chatId) {
  const [chat, setChat] = useState(undefined);
  useEffect(() => {
    if (!chatId) return setChat(null);
    return onSnapshot(
      doc(db, "chats", chatId),
      (snap) => setChat(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      () => setChat(null)
    );
  }, [chatId]);
  return chat;
}

// Group and event chats (team chats have no member list).
// Event chats remember who left or was removed (`removed.{uid}`), so the automatic sync doesn't add them
// back; only being accepted into a role again does (joinEventChat).
export const leaveGroup = (chatId, uid) =>
  updateDoc(doc(db, "chats", chatId), {
    members: arrayRemove(uid),
    [`memberNames.${uid}`]: deleteField(),
    ...(isEventChatId(chatId) ? { [`memberRoles.${uid}`]: deleteField(), [`removed.${uid}`]: true } : {}),
  });

// ---------- Group admin (group creator; for event chats: the event's organization, staff, event helpers) ----------
// Rules enforce who may do this (firestore.rules → chats → isChatAdmin).
const chatRef = (chatId) => doc(db, "chats", chatId);

export const setGroupDescription = (chatId, description) =>
  updateDoc(chatRef(chatId), { description: description.trim().slice(0, 300) });

export const MAX_GROUP_NAME = 50;
export const renameGroup = (chatId, name) => updateDoc(chatRef(chatId), { name: name.trim().slice(0, MAX_GROUP_NAME) });

// photo: small square JPEG data URI (see pickGroupPhoto in src/profile/photo.js), or null to remove it.
export const setGroupPhoto = (chatId, photo) => updateDoc(chatRef(chatId), { photo: photo ?? deleteField() });

// people: [{ id, name }]
export const addGroupMembers = (chatId, people) =>
  updateDoc(chatRef(chatId), {
    members: arrayUnion(...people.map((p) => p.id)),
    ...Object.fromEntries(people.map((p) => [`memberNames.${p.id}`, p.name || "Member"])),
    ...(isEventChatId(chatId) ? Object.fromEntries(people.map((p) => [`removed.${p.id}`, deleteField()])) : {}),
  });

export const removeGroupMember = (chatId, uid) => leaveGroup(chatId, uid);

// Admin of this chat, as the rules see it. `canReviewEvent` from useAuth().
export function isChatAdmin(chat, uid, { canReviewEvent, eventById }) {
  if (!chat || chat.type === "team" || chat.type === "direct") return false;
  if (chat.type === "event") return canReviewEvent(eventById?.[chat.eventId]);
  return chat.createdBy === uid;
}

// ---------- Event chats ----------
// chats/event_<eventId> { type: "event", eventId, name, photo?, description, createdBy (the event's organization),
//   members[], memberNames{}, memberRoles{ uid: { jobId: true } } }. The organization is always in it; every
// volunteer accepted into one of the event's roles joins automatically and leaves when they're no longer
// accepted in any role. Admins (organization, staff, event helpers) can rename it, set a photo, add/remove people.
export const eventChatId = (eventId) => `event_${eventId}`;
export const isEventChatId = (id) => typeof id === "string" && id.startsWith("event_");

// Creates the event's chat if it doesn't exist yet. Returns its data.
export async function ensureEventChat(event) {
  const ref = chatRef(eventChatId(event.id));
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const creator = event.createdBy;
  const data = {
    type: "event",
    eventId: event.id,
    name: (event.title || "Event").slice(0, MAX_GROUP_NAME),
    description: "",
    createdBy: creator ?? "",
    members: creator ? [creator] : [],
    memberNames: creator ? { [creator]: event.organizerName || "Organizer" } : {},
    memberRoles: {},
    lastMessage: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return data;
}

// After someone is accepted into a role (admins only). Adds them, and records which role.
export async function joinEventChat(event, jobId, person) {
  await ensureEventChat(event);
  await updateDoc(chatRef(eventChatId(event.id)), {
    members: arrayUnion(person.id),
    [`memberNames.${person.id}`]: person.name || "Volunteer",
    [`memberRoles.${person.id}.${jobId}`]: true,
    [`removed.${person.id}`]: deleteField(),
  });
}

// After someone stops being accepted in a role (declined by an admin, or they withdrew themselves).
// They stay while they're still accepted in another of the event's roles; the organization always stays.
export async function leaveEventRole(eventId, jobId, uid) {
  const ref = chatRef(eventChatId(eventId));
  const snap = await getDoc(ref).catch(() => null);
  if (!snap?.exists()) return;
  const chat = snap.data();
  if (!chat.members?.includes(uid)) return;
  const otherRoles = Object.keys(chat.memberRoles?.[uid] ?? {}).filter((id) => id !== String(jobId));
  if (otherRoles.length || uid === chat.createdBy) {
    await updateDoc(ref, { [`memberRoles.${uid}.${jobId}`]: deleteField() });
  } else {
    await leaveGroup(eventChatId(eventId), uid);
  }
}

// Self-heal (admins, from the applicants screen): everyone accepted in this role is in the chat.
export async function syncEventChatRole(event, jobId, acceptedApps) {
  const chat = await ensureEventChat(event);
  const missing = acceptedApps.filter(
    (a) => !chat.removed?.[a.id] && (!chat.members?.includes(a.id) || !chat.memberRoles?.[a.id]?.[jobId])
  );
  if (!missing.length) return;
  await updateDoc(chatRef(eventChatId(event.id)), {
    members: arrayUnion(...missing.map((a) => a.id)),
    ...Object.fromEntries(missing.flatMap((a) => [
      [`memberNames.${a.id}`, a.name || "Volunteer"],
      [`memberRoles.${a.id}.${jobId}`, true],
    ])),
  });
}

export async function openDirectChat(me, myName, friend) {
  const id = directChatId(me, friend.id);
  const ref = doc(db, "chats", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      type: "direct",
      members: [me, friend.id],
      memberNames: { [me]: myName, [friend.id]: friend.name },
      lastMessage: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return id;
}

export async function createGroup(me, myName, name, friends) {
  const ref = await addDoc(collection(db, "chats"), {
    type: "group",
    name: name.trim(),
    createdBy: me,
    members: [me, ...friends.map((f) => f.id)],
    memberNames: Object.fromEntries([[me, myName], ...friends.map((f) => [f.id, f.name])]),
    lastMessage: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function sendMessage(chatId, me, myName, text) {
  const body = text.trim();
  if (!body) return;
  await addDoc(collection(db, "chats", chatId, "messages"), {
    text: body,
    senderId: me,
    senderName: myName,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: body.slice(0, 100),
    lastSender: myName,
    updatedAt: serverTimestamp(),
  });
}

// ---------- Team chats ----------
// Fixed chats for the team. Nobody is added by hand: who's in them follows the roles in Admin → Team.
export const TEAM_CHATS = [
  { id: "team_owners", name: "Owners", description: "Owners only", allowed: (r) => r.isOwner },
  { id: "team_staff", name: "Staff", description: "Owners, admins and testers", allowed: (r) => r.isStaff },
];

// roles: { isOwner, isStaff } from useAuth(). Creates a team chat the first time someone allowed opens the list.
export function useTeamChats(roles) {
  const ids = TEAM_CHATS.filter((t) => t.allowed(roles)).map((t) => t.id);
  const key = ids.join(",");
  const [chats, setChats] = useState({});
  useEffect(() => {
    setChats({});
    const unsubs = ids.map((id) => {
      const team = TEAM_CHATS.find((t) => t.id === id);
      const ref = doc(db, "chats", id);
      return onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) return setChats((c) => ({ ...c, [id]: { id, ...snap.data(), description: team.description } }));
          if (snap.metadata.fromCache) return; // wait for the server before creating it
          setDoc(ref, { type: "team", name: team.name, lastMessage: "", createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
            .catch(() => {}); // someone else created it at the same moment — the snapshot picks it up
        },
        (err) => console.warn("Team chat error:", err.message)
      );
    });
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ids.map((id) => chats[id]).filter(Boolean);
}

export function chatTitle(chat, uid) {
  if (chat.type === "group" || chat.type === "team" || chat.type === "event") return chat.name;
  const other = chat.members.find((m) => m !== uid);
  return chat.memberNames?.[other] ?? "Chat";
}
