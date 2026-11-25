import { useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { addGroupMembers, useChat, useFriendships } from "../../chat/api";
import { Avatar, Button } from "../../components/ui";
import { colors, common } from "../../theme";

// Group info → "+ Add people" (admins): pick friends who aren't in the chat yet.
export default function AddMembersScreen({ route, navigation }) {
  const { chatId } = route.params;
  const { user } = useAuth();
  const chat = useChat(chatId);
  const friends = useFriendships(user.uid).filter((f) => f.status === "accepted");
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);

  const inChat = new Set(chat?.members ?? []);
  const candidates = friends.filter((f) => !inChat.has(f.id)).sort((a, b) => a.name.localeCompare(b.name));
  const chosen = candidates.filter((f) => selected[f.id]);
  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const add = async () => {
    setBusy(true);
    try {
      await addGroupMembers(chatId, chosen.map((f) => ({ id: f.id, name: f.name })));
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't add", e.message);
      setBusy(false);
    }
  };

  return (
    <FlatList
      style={common.screen}
      data={candidates}
      keyExtractor={(f) => f.id}
      contentContainerStyle={common.list}
      ListHeaderComponent={
        <Text style={common.sectionTitle}>
          Add friends to {chat?.name ?? "the group"} ({chosen.length} selected)
        </Text>
      }
      ListEmptyComponent={
        <Text style={common.empty}>
          {friends.length ? "All your friends are already in this chat." : "Add some friends first, then you can add them here."}
        </Text>
      }
      renderItem={({ item: f }) => {
        const on = !!selected[f.id];
        return (
          <Pressable
            style={[common.card, common.row, on && { borderColor: colors.accent, borderWidth: 2 }]}
            onPress={() => toggle(f.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
          >
            <Avatar name={f.name} />
            <Text style={[common.title, { flex: 1 }]} numberOfLines={1}>
              {f.name}
            </Text>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: on ? colors.accent : colors.border,
                backgroundColor: on ? colors.accent : "transparent",
              }}
            />
          </Pressable>
        );
      }}
      ListFooterComponent={
        <Button
          title={chosen.length ? `Add ${chosen.length} ${chosen.length === 1 ? "person" : "people"}` : "Add people"}
          onPress={add}
          loading={busy}
          disabled={!chosen.length}
        />
      }
    />
  );
}
