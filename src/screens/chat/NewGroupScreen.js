import { useState } from "react";
import { Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { createGroup, useFriendships } from "../../chat/api";
import { Avatar, Button } from "../../components/ui";
import { colors, common } from "../../theme";

export default function NewGroupScreen({ navigation }) {
  const { user, displayName } = useAuth();
  const friends = useFriendships(user.uid).filter((f) => f.status === "accepted");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState({});
  const [busy, setBusy] = useState(false);

  const chosen = friends.filter((f) => selected[f.id]);
  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const create = async () => {
    setBusy(true);
    try {
      const chatId = await createGroup(user.uid, displayName, name, chosen);
      navigation.replace("ChatRoom", { chatId, title: name.trim() });
    } catch (e) {
      Alert.alert("Couldn't create group", e.message);
      setBusy(false);
    }
  };

  return (
    <FlatList
      style={common.screen}
      data={friends}
      keyExtractor={(f) => f.id}
      contentContainerStyle={common.list}
      ListHeaderComponent={
        <View style={{ gap: 6 }}>
          <Text style={common.label}>Group name</Text>
          <TextInput
            style={common.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Career Fair volunteers"
            placeholderTextColor={colors.muted}
          />
          <Text style={common.sectionTitle}>Add friends ({chosen.length} selected)</Text>
        </View>
      }
      ListEmptyComponent={<Text style={common.empty}>Add some friends first, then create a group.</Text>}
      ListFooterComponent={
        <Button title="Create group" onPress={create} loading={busy} disabled={!name.trim() || chosen.length === 0} />
      }
      renderItem={({ item: f }) => (
        <Pressable style={[common.card, common.row, selected[f.id] && { borderColor: colors.accent }]} onPress={() => toggle(f.id)}>
          <Avatar name={f.name} />
          <Text style={[common.title, { flex: 1 }]}>{f.name}</Text>
          <Text style={{ fontSize: 20, color: selected[f.id] ? colors.accent : colors.border }}>{selected[f.id] ? "●" : "○"}</Text>
        </Pressable>
      )}
    />
  );
}
