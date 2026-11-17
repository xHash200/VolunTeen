import { useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { addTeamMember, ROLES, useTeam } from "../../admin/api";
import { searchUsers } from "../../chat/api";
import { Avatar, Button, Field } from "../../components/ui";
import { common } from "../../theme";

const DESCRIPTIONS = {
  owners: "will have full access: verify organizations, edit content, and add or remove owners and testers.",
  testers: "will be able to verify organizations and edit jobs, events and leagues, and will see debug info.",
};

export default function AddTeamMemberScreen({ route }) {
  const { role } = route.params; // "owners" | "testers"
  const { user } = useAuth();
  const members = useTeam(role);
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const label = ROLES[role].label.toLowerCase();

  const search = async () => {
    setBusy(true);
    try {
      setResults(await searchUsers(text));
      setSearched(true);
    } catch (e) {
      Alert.alert("Search failed", e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmAdd = (u) =>
    Alert.alert(`Make ${label}?`, `${u.displayName} ${DESCRIPTIONS[role]}`, [
      { text: "Cancel", style: "cancel" },
      { text: `Make ${label}`, onPress: () => addTeamMember(role, u, user.uid).catch((e) => Alert.alert("Failed", e.message)) },
    ]);

  return (
    <FlatList
      style={common.screen}
      data={results}
      keyExtractor={(u) => u.id}
      contentContainerStyle={common.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={common.row}>
          <View style={{ flex: 1 }}>
            <Field value={text} onChangeText={setText} placeholder="Search people by name" onSubmitEditing={search} returnKeyType="search" autoFocus />
          </View>
          <Button title="Search" onPress={search} loading={busy} disabled={!text.trim()} />
        </View>
      }
      ListEmptyComponent={searched ? <Text style={common.empty}>No one found with that name.</Text> : null}
      renderItem={({ item: u }) => {
        const already = members.some((m) => m.uid === u.id);
        return (
          <View style={[common.card, common.row]}>
            <Avatar name={u.displayName} />
            <View style={{ flex: 1 }}>
              <Text style={common.title}>{u.displayName}</Text>
              <Text style={common.meta}>{u.accountType === "organization" ? "Organization" : "Personal"}</Text>
            </View>
            {already ? (
              <Text style={common.meta}>{ROLES[role].label}</Text>
            ) : (
              <Button small title={`Make ${label}`} onPress={() => confirmAdd(u)} />
            )}
          </View>
        );
      }}
    />
  );
}
