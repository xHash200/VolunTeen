import { useState } from "react";
import { Alert, FlatList, Text, TextInput, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { searchUsers, sendFriendRequest, useFriendships } from "../../chat/api";
import { Avatar, Button } from "../../components/ui";
import { colors, common } from "../../theme";

export default function AddFriendScreen() {
  const { user, displayName } = useAuth();
  const friendships = useFriendships(user.uid);
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setBusy(true);
    try {
      setResults((await searchUsers(text)).filter((u) => u.id !== user.uid));
      setSearched(true);
    } catch (e) {
      Alert.alert("Search failed", e.message);
    } finally {
      setBusy(false);
    }
  };

  const statusFor = (uid) => {
    const f = friendships.find((x) => x.id === uid);
    if (!f) return null;
    if (f.status === "accepted") return "Friends";
    return f.incoming ? "Accept" : "Requested";
  };

  const add = (u) => sendFriendRequest(user.uid, displayName, u).catch((e) => Alert.alert("Couldn't send request", e.message));

  return (
    <FlatList
      style={common.screen}
      data={results}
      keyExtractor={(u) => u.id}
      contentContainerStyle={common.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={common.row}>
          <TextInput
            style={[common.input, { flex: 1 }]}
            value={text}
            onChangeText={setText}
            placeholder="Search by name"
            placeholderTextColor={colors.muted}
            onSubmitEditing={search}
            returnKeyType="search"
            autoFocus
          />
          <Button title="Search" onPress={search} loading={busy} disabled={!text.trim()} />
        </View>
      }
      ListEmptyComponent={searched ? <Text style={common.empty}>No one found with that name.</Text> : null}
      renderItem={({ item: u }) => {
        const status = statusFor(u.id);
        return (
          <View style={[common.card, common.row]}>
            <Avatar name={u.displayName} />
            <View style={{ flex: 1 }}>
              <Text style={common.title}>{u.displayName}</Text>
              {!!u.faculty && <Text style={common.meta}>{u.faculty}</Text>}
            </View>
            {status === "Friends" || status === "Requested" ? (
              <Text style={common.meta}>{status}</Text>
            ) : (
              <Button small title={status === "Accept" ? "Accept" : "Add"} onPress={() => add(u)} />
            )}
          </View>
        );
      }}
    />
  );
}
