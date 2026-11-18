import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../auth/AuthContext";
import { leaveGroup, setGroupDescription, TEAM_CHATS, useChat } from "../../chat/api";
import { useTeam } from "../../admin/api";
import { RoleTag, useRoleTagOf } from "../../components/RoleTag";
import { Avatar, Button, Field } from "../../components/ui";
import { colors, common, formatDate } from "../../theme";

// "Group info" (⋮ in a group or team chat): description, details and every member with their role.

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
  const { user } = useAuth();
  const chat = useChat(chatId);
  const team = TEAM_CHATS.find((t) => t.id === chatId);
  const teamMembers = useTeamMembers(team?.id);
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  if (chat === undefined) return <Text style={[common.screen, common.empty]}>Loading…</Text>;
  if (chat === null) return <Text style={[common.screen, common.empty]}>This chat isn't available.</Text>;

  const members = team
    ? teamMembers
    : [...(chat.members ?? [])]
        .map((uid) => ({ uid, name: chat.memberNames?.[uid] ?? "Unknown" }))
        .sort((a, b) => (a.uid === chat.createdBy ? -1 : b.uid === chat.createdBy ? 1 : a.name.localeCompare(b.name)));
  const isCreator = !team && chat.createdBy === user.uid;
  const description = team ? team.description : chat.description;

  const saveDesc = async () => {
    setBusy(true);
    try {
      await setGroupDescription(chatId, desc);
      setEditing(false);
    } catch (e) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmLeave = () =>
    Alert.alert("Leave group?", `You'll stop getting messages from ${chat.name}. Someone in the group can add you again.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () =>
          leaveGroup(chatId, user.uid)
            .then(() => navigation.popToTop())
            .catch((e) => Alert.alert("Couldn't leave", e.message)),
      },
    ]);

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list}>
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
        <Avatar name={chat.name} size={72} />
        <Text style={[common.title, { fontSize: 20 }]}>{chat.name}</Text>
        <Text style={common.meta}>
          {team ? "Team chat" : "Group"} · {members.length} member{members.length === 1 ? "" : "s"}
        </Text>
      </View>

      <View style={[common.card, { gap: 6 }]}>
        <Text style={common.label}>Description</Text>
        {editing ? (
          <>
            <Field value={desc} onChangeText={setDesc} multiline maxLength={300} placeholder="What's this group for?" autoFocus />
            <View style={[common.row, { gap: 8 }]}>
              <Button small title="Save" onPress={saveDesc} loading={busy} />
              <Button small variant="secondary" title="Cancel" onPress={() => setEditing(false)} />
            </View>
          </>
        ) : (
          <>
            <Text style={common.body}>{description || "No description yet."}</Text>
            {isCreator && (
              <Button
                small
                variant="secondary"
                title={description ? "Edit description" : "Add description"}
                onPress={() => {
                  setDesc(chat.description ?? "");
                  setEditing(true);
                }}
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
            <Text style={common.label}>Created by</Text>
            <Text style={common.body}>{chat.memberNames?.[chat.createdBy] ?? "A former member"}</Text>
          </>
        )}
        <Text style={common.label}>Last activity</Text>
        <Text style={common.body}>{chat.lastMessage ? dateOf(chat.updatedAt) : "No messages yet"}</Text>
      </View>

      <Text style={common.sectionTitle}>Members ({members.length})</Text>
      {members.map((m) => (
        <MemberRow
          key={m.uid}
          member={m}
          isMe={m.uid === user.uid}
          onPress={(name) => navigation.navigate("UserProfile", { uid: m.uid, name })}
        />
      ))}

      {!team && <Button variant="danger" title="Leave group" onPress={confirmLeave} style={{ marginTop: 8 }} />}
    </ScrollView>
  );
}

// Tap a member to open their public profile.
function MemberRow({ member, isMe, onPress }) {
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
      {/* Just the tag and the name, e.g. "[OWN] Ana (you)". */}
      <Text style={[common.title, { flex: 1 }]} numberOfLines={1}>
        <RoleTag kind={kind} />
        {name}
        {isMe ? " (you)" : ""}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}
