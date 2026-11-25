import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import {
  acceptFriendRequest,
  directChatId,
  openDirectChat,
  removeFriendship,
  useChats,
  useFriendships,
  useTeamChats,
} from "../../chat/api";
import { Avatar, Button, Segmented, SignInPrompt } from "../../components/ui";
import { common, themed } from "../../theme";

export default function ChatHomeScreen({ navigation }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("groups");

  if (!user) return <SignInPrompt navigation={navigation} message="Sign in to chat with friends and groups." />;

  return (
    <View style={common.screen}>
      <Segmented
        options={[
          { value: "groups", label: "Groups" },
          { value: "friends", label: "Friends" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "groups" ? <GroupsList navigation={navigation} /> : <FriendsList navigation={navigation} />}
    </View>
  );
}

function ChatRow({ title, subtitle, photo, onPress, onLongPress, right }) {
  return (
    <Pressable style={[common.card, common.row]} onPress={onPress} onLongPress={onLongPress} disabled={!onPress && !onLongPress}>
      <Avatar name={title} photo={photo} />
      <View style={{ flex: 1 }}>
        <Text style={common.title} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={common.meta} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </Pressable>
  );
}

function GroupsList({ navigation }) {
  const { user, isOwner, isStaff } = useAuth();
  const chats = useChats(user.uid);
  const groups = chats.filter((c) => c.type === "group");
  // Event chats: one per event you're accepted into (or run). See ensureEventChat in chat/api.js.
  const eventChats = chats.filter((c) => c.type === "event");
  // Owners / Staff chats, shown only to people with that role.
  const teamChats = useTeamChats({ isOwner, isStaff });
  const open = (c) => navigation.navigate("ChatRoom", { chatId: c.id, title: c.name });
  const preview = (c, fallback) => (c.lastMessage ? `${c.lastSender ?? ""}: ${c.lastMessage}` : fallback);

  return (
    <FlatList
      data={groups}
      keyExtractor={(c) => c.id}
      contentContainerStyle={common.list}
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          {teamChats.length > 0 && (
            <>
              <Text style={common.sectionTitle}>Team</Text>
              {teamChats.map((c) => (
                <ChatRow key={c.id} title={c.name} subtitle={preview(c, c.description)} photo={c.photo} onPress={() => open(c)} />
              ))}
            </>
          )}
          {eventChats.length > 0 && (
            <>
              <Text style={common.sectionTitle}>Events</Text>
              {eventChats.map((c) => (
                <ChatRow
                  key={c.id}
                  title={c.name}
                  subtitle={preview(c, `${c.members.length} member${c.members.length === 1 ? "" : "s"}`)}
                  photo={c.photo}
                  onPress={() => open(c)}
                />
              ))}
            </>
          )}
          {(teamChats.length > 0 || eventChats.length > 0) && <Text style={common.sectionTitle}>Your groups</Text>}
          <Button title="+ New group" onPress={() => navigation.navigate("NewGroup")} />
        </View>
      }
      ListEmptyComponent={<Text style={common.empty}>No groups yet. Create one with your friends.</Text>}
      renderItem={({ item: c }) => (
        <ChatRow title={c.name} subtitle={preview(c, `${c.members.length} members`)} photo={c.photo} onPress={() => open(c)} />
      )}
    />
  );
}

function FriendsList({ navigation }) {
  const { user, displayName } = useAuth();
  const friendships = useFriendships(user.uid);
  const chats = useChats(user.uid);
  const [opening, setOpening] = useState(null);

  const lastMessage = (friendId) => chats.find((c) => c.id === directChatId(user.uid, friendId))?.lastMessage;
  const incoming = friendships.filter((f) => f.incoming);
  const outgoing = friendships.filter((f) => f.status === "pending" && !f.incoming);
  const friends = friendships.filter((f) => f.status === "accepted").sort((a, b) => a.name.localeCompare(b.name));

  const openChat = async (friend) => {
    setOpening(friend.id);
    try {
      const chatId = await openDirectChat(user.uid, displayName, friend);
      navigation.navigate("ChatRoom", { chatId, title: friend.name });
    } catch (e) {
      Alert.alert("Couldn't open chat", e.message);
    } finally {
      setOpening(null);
    }
  };

  const confirmRemove = (f) =>
    Alert.alert("Remove friend?", `Remove ${f.name} from your friends?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeFriendship(f.friendshipId) },
    ]);

  const sections = [
    ...(incoming.length ? [{ header: "Friend requests" }, ...incoming.map((f) => ({ kind: "incoming", f }))] : []),
    ...(outgoing.length ? [{ header: "Sent requests" }, ...outgoing.map((f) => ({ kind: "outgoing", f }))] : []),
    { header: `Friends (${friends.length})` },
    ...friends.map((f) => ({ kind: "friend", f })),
  ];

  return (
    <FlatList
      data={sections}
      keyExtractor={(item, i) => item.header ?? `${item.kind}-${item.f.id}-${i}`}
      contentContainerStyle={common.list}
      ListHeaderComponent={<Button title="+ Add friend" onPress={() => navigation.navigate("AddFriend")} />}
      ListFooterComponent={friends.length === 0 ? <Text style={common.empty}>No friends yet. Search for people to add.</Text> : null}
      renderItem={({ item }) => {
        if (item.header) return <Text style={common.sectionTitle}>{item.header}</Text>;
        const { f } = item;
        if (item.kind === "incoming")
          return (
            <ChatRow
              title={f.name}
              subtitle="Wants to be your friend"
              right={
                <View style={styles.actions}>
                  <Button small title="Accept" onPress={() => acceptFriendRequest(f.friendshipId)} />
                  <Button small variant="secondary" title="Decline" onPress={() => removeFriendship(f.friendshipId)} />
                </View>
              }
            />
          );
        if (item.kind === "outgoing")
          return (
            <ChatRow
              title={f.name}
              subtitle="Request sent"
              right={<Button small variant="secondary" title="Cancel" onPress={() => removeFriendship(f.friendshipId)} />}
            />
          );
        return (
          <ChatRow
            title={f.name}
            subtitle={lastMessage(f.id) || "Tap to chat · hold to remove"}
            onPress={() => openChat(f)}
            onLongPress={() => confirmRemove(f)}
            right={opening === f.id ? <Text style={common.meta}>…</Text> : null}
          />
        );
      }}
    />
  );
}

const styles = themed((colors) => StyleSheet.create({
  actions: { gap: 6 },
}));
