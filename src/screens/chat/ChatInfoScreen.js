import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../data/DataContext";
import {
  isChatAdmin,
  leaveGroup,
  MAX_GROUP_NAME,
  removeGroupMember,
  renameGroup,
  setGroupDescription,
  setGroupPhoto,
  TEAM_CHATS,
  useChat,
} from "../../chat/api";
import { useTeam } from "../../admin/api";
import { pickGroupPhoto } from "../../profile/photo";
import { NameWithTag, useRoleTagOf } from "../../components/RoleTag";
import { Avatar, Button, Field } from "../../components/ui";
import { colors, common, formatDate, themed } from "../../theme";

// "Group info" (tap the chat's title, or ⋮): photo, name, description, details and every member with their role.
// Admins (group creator; for event chats the event's organization, staff and event helpers) can change the
// photo, name and description, add people and remove them. Team chats are fixed.

const ROLE_RANK = { owner: 0, admin: 1, tester: 2 };
const dateOf = (ts) => (ts?.toDate ? formatDate(ts.toDate()) : "—");

// Team chats have no member list: members are whoever holds the role right now.
function useTeamMembers(teamId) {
  const owners = useTeam("owners");
  const admins = useTeam("admins");
  const testers = useTeam("testers");
  if (!teamId) return [];
  const lists = teamId === "team_owners" ? [["owner", owners]] : [["owner", owners], ["admin", admins], ["tester", testers]];
  const byUid = new Map();
  for (const [role, list] of lists)
    for (const m of list) if (!byUid.has(m.uid)) byUid.set(m.uid, { uid: m.uid, name: m.displayName || "Unknown", role });
  return [...byUid.values()].sort((a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || a.name.localeCompare(b.name));
}

export default function ChatInfoScreen({ route, navigation }) {
  const { chatId } = route.params;
  const { user, canReviewEvent } = useAuth();
  const { eventById, jobs } = useData();
  const chat = useChat(chatId);
  const team = TEAM_CHATS.find((t) => t.id === chatId);
  const teamMembers = useTeamMembers(team?.id);
  const [editing, setEditing] = useState(null); // "name" | "description" | null
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(null);

  if (chat === undefined) return <Text style={[common.screen, common.empty]}>Loading…</Text>;
  if (chat === null) return <Text style={[common.screen, common.empty]}>This chat isn't available.</Text>;

  const isEvent = chat.type === "event";
  const event = isEvent ? eventById[chat.eventId] : null;
  const admin = !team && isChatAdmin(chat, user.uid, { canReviewEvent, eventById });
  const roleTitle = Object.fromEntries(jobs.map((j) => [String(j.id), j.title]));
  // Event chats: each volunteer's roles at the event, e.g. "Logistics, Organizer".
  const rolesOf = (uid) =>
    Object.keys(chat.memberRoles?.[uid] ?? {})
      .map((id) => roleTitle[id])
      .filter(Boolean)
      .join(", ");

  const members = team
    ? teamMembers
    : [...(chat.members ?? [])]
        .map((uid) => ({ uid, name: chat.memberNames?.[uid] ?? "Unknown", sub: isEvent ? (uid === chat.createdBy ? "Organization" : rolesOf(uid)) : "" }))
        .sort((a, b) => (a.uid === chat.createdBy ? -1 : b.uid === chat.createdBy ? 1 : a.name.localeCompare(b.name)));
  const description = team ? team.description : chat.description;
  const kindLabel = team ? "Team chat" : isEvent ? "Event chat" : "Group";

  const run = (kind, fn) => async () => {
    setBusy(kind);
    try {
      await fn();
      setEditing(null);
    } catch (e) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (field) => {
    setText(field === "name" ? chat.name ?? "" : chat.description ?? "");
    setEditing(field);
  };
  const saveName = () => {
    if (!text.trim()) return Alert.alert("Name", "The group needs a name.");
    run("name", () => renameGroup(chatId, text))();
  };
  const saveDesc = run("description", () => setGroupDescription(chatId, text));

  const changePhoto = () =>
    Alert.alert("Group picture", undefined, [
      {
        text: chat.photo ? "Change picture" : "Add picture",
        onPress: run("photo", async () => {
          const photo = await pickGroupPhoto();
          if (photo) await setGroupPhoto(chatId, photo);
        }),
      },
      ...(chat.photo ? [{ text: "Remove picture", style: "destructive", onPress: run("photo", () => setGroupPhoto(chatId, null)) }] : []),
      { text: "Cancel", style: "cancel" },
    ]);

  const confirmRemove = (m) =>
    Alert.alert(
      `Remove ${m.name}?`,
      isEvent
        ? "They'll stop getting this chat's messages. Their role at the event doesn't change. If they're accepted into another role later, they're added back."
        : "They'll stop getting this group's messages. You can add them again later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeGroupMember(chatId, m.uid).catch((e) => Alert.alert("Couldn't remove", e.message)),
        },
      ]
    );

  const confirmLeave = () =>
    Alert.alert(
      isEvent ? "Leave event chat?" : "Leave group?",
      `You'll stop getting messages from ${chat.name}.${isEvent ? "" : " Someone in the group can add you again."}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () =>
            leaveGroup(chatId, user.uid)
              .then(() => navigation.popToTop())
              .catch((e) => Alert.alert("Couldn't leave", e.message)),
        },
      ]
    );

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
        <Pressable onPress={admin ? changePhoto : undefined} disabled={!admin || busy === "photo"} accessibilityLabel="Group picture">
          <View style={{ opacity: busy === "photo" ? 0.5 : 1 }}>
            <Avatar name={chat.name} size={88} photo={chat.photo} />
            {admin && (
              <View style={styles.camera}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            )}
          </View>
          {busy === "photo" && <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.accent} />}
        </Pressable>

        {editing === "name" ? (
          <View style={{ alignSelf: "stretch", gap: 8 }}>
            <Field value={text} onChangeText={setText} maxLength={MAX_GROUP_NAME} placeholder="Group name" autoFocus />
            <View style={[common.row, { gap: 8, justifyContent: "center" }]}>
              <Button small title="Save" onPress={saveName} loading={busy === "name"} />
              <Button small variant="secondary" title="Cancel" onPress={() => setEditing(null)} />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={admin ? () => startEdit("name") : undefined}
            disabled={!admin}
            style={[common.row, { gap: 6 }]}
            accessibilityLabel={admin ? "Rename group" : undefined}
          >
            <Text style={[common.title, { fontSize: 20, textAlign: "center" }]}>{chat.name}</Text>
            {admin && <Ionicons name="pencil" size={16} color={colors.muted} />}
          </Pressable>
        )}
        <Text style={common.meta}>
          {kindLabel} · {members.length} member{members.length === 1 ? "" : "s"}
        </Text>
      </View>

      {isEvent && (
        <View style={[common.card, { gap: 4 }]}>
          <Text style={common.label}>Event</Text>
          <Text style={common.body}>
            {event?.title ?? "This event was removed"}
            {event?.date ? ` · ${formatDate(event.date)}` : ""}
            {event?.location ? ` · ${event.location}` : ""}
          </Text>
          <Text style={[common.meta, { marginTop: 4 }]}>
            Everyone accepted into one of this event's roles joins automatically.
          </Text>
        </View>
      )}

      <View style={[common.card, { gap: 6 }]}>
        <Text style={common.label}>Description</Text>
        {editing === "description" ? (
          <>
            <Field value={text} onChangeText={setText} multiline maxLength={300} placeholder="What's this group for?" autoFocus />
            <View style={[common.row, { gap: 8 }]}>
              <Button small title="Save" onPress={saveDesc} loading={busy === "description"} />
              <Button small variant="secondary" title="Cancel" onPress={() => setEditing(null)} />
            </View>
          </>
        ) : (
          <>
            <Text style={common.body}>{description || "No description yet."}</Text>
            {admin && (
              <Button
                small
                variant="secondary"
                title={description ? "Edit description" : "Add description"}
                onPress={() => startEdit("description")}
                style={{ alignSelf: "flex-start", marginTop: 4 }}
              />
            )}
          </>
        )}
        {team && (
          <Text style={[common.meta, { marginTop: 4 }]}>
            Members follow the roles in Admin → Team. Adding or removing someone there updates this chat automatically.
          </Text>
        )}
      </View>

      <View style={[common.card, { gap: 4 }]}>
        <Text style={common.label}>Created</Text>
        <Text style={common.body}>{dateOf(chat.createdAt)}</Text>
        {!team && (
          <>
            <Text style={common.label}>{isEvent ? "Organization" : "Created by"}</Text>
            <Text style={common.body}>{chat.memberNames?.[chat.createdBy] ?? "A former member"}</Text>
          </>
        )}
        <Text style={common.label}>Last activity</Text>
        <Text style={common.body}>{chat.lastMessage ? dateOf(chat.updatedAt) : "No messages yet"}</Text>
      </View>

      <View style={[common.row, { justifyContent: "space-between" }]}>
        <Text style={common.sectionTitle}>Members ({members.length})</Text>
        {admin && (
          <Button small title="+ Add people" onPress={() => navigation.navigate("AddMembers", { chatId })} />
        )}
      </View>
      {members.map((m) => (
        <MemberRow
          key={m.uid}
          member={m}
          isMe={m.uid === user.uid}
          onPress={(name) => navigation.navigate("UserProfile", { uid: m.uid, name })}
          // Admins remove others; the event's organization stays in its event chat.
          onRemove={admin && m.uid !== user.uid && !(isEvent && m.uid === chat.createdBy) ? () => confirmRemove(m) : null}
        />
      ))}

      {!team && (
        <Button variant="danger" title={isEvent ? "Leave event chat" : "Leave group"} onPress={confirmLeave} style={{ marginTop: 8 }} />
      )}
    </ScrollView>
  );
}

// Tap a member to open their public profile. `onRemove` (admins) shows a remove button.
function MemberRow({ member, isMe, onPress, onRemove }) {
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    let alive = true;
    getDoc(doc(db, "users", member.uid))
      .then((s) => alive && setProfile(s.exists() ? s.data() : null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [member.uid]);
  // Team members' role is already known; for groups, look it up.
  const looked = useRoleTagOf(member.role ? null : member.uid, profile);
  const kind = member.role ?? looked;
  const name = profile?.displayName || member.name;

  return (
    <Pressable
      style={({ pressed }) => [common.card, common.row, pressed && { opacity: 0.7 }]}
      onPress={() => onPress(name)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}'s profile`}
    >
      <Avatar name={name} photo={profile?.photo} />
      <View style={{ flex: 1, gap: 2 }}>
        {/* The tag pill and the name, e.g. "OWN Ana (you)"; event chats add their role at the event. */}
        <NameWithTag kind={kind} name={name} textStyle={common.title}>
          {isMe ? " (you)" : ""}
        </NameWithTag>
        {!!member.sub && (
          <Text style={[common.meta, { fontSize: 12 }]} numberOfLines={1}>
            {member.sub}
          </Text>
        )}
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel={`Remove ${name}`}>
          <Ionicons name="close-circle-outline" size={24} color="#c0392b" />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      )}
    </Pressable>
  );
}

const styles = themed((colors) => StyleSheet.create({
  camera: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },
}));
