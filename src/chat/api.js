import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
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

export function chatTitle(chat, uid) {
  if (chat.type === "group") return chat.name;
  const other = chat.members.find((m) => m !== uid);
  return chat.memberNames?.[other] ?? "Chat";
}
