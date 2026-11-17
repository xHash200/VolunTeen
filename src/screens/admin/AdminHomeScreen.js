import { useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { removeOwner, useApplications, useOwners } from "../../admin/api";
import { Avatar, Button, Chips, Segmented } from "../../components/ui";
import { common } from "../../theme";

export default function AdminHomeScreen({ navigation }) {
  const [tab, setTab] = useState("orgs");
  return (
    <View style={common.screen}>
      <Segmented
        options={[
          { value: "orgs", label: "Organizations" },
          { value: "owners", label: "Owners" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "orgs" ? <OrgRequests navigation={navigation} /> : <Owners navigation={navigation} />}
    </View>
  );
}

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

function OrgRequests({ navigation }) {
  const [status, setStatus] = useState("pending");
  const apps = useApplications(status);

  return (
    <FlatList
      data={apps}
      keyExtractor={(a) => a.uid}
      contentContainerStyle={common.list}
      ListHeaderComponent={<Chips options={STATUSES} value={status} onChange={setStatus} />}
      ListEmptyComponent={<Text style={common.empty}>No {status} organizations.</Text>}
      renderItem={({ item: a }) => (
        <Pressable style={[common.card, common.row]} onPress={() => navigation.navigate("OrgReview", { uid: a.uid, title: a.orgName })}>
          <Avatar name={a.orgName} />
          <View style={{ flex: 1 }}>
            <Text style={common.title}>{a.orgName}</Text>
            <Text style={common.meta}>
              {a.orgType} · {a.university}
            </Text>
            <Text style={common.meta}>{a.emailVerified ? "✓ Email confirmed" : "Email not confirmed"}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

function Owners({ navigation }) {
  const { user } = useAuth();
  const owners = useOwners();

  const confirmRemove = (o) =>
    Alert.alert("Remove owner?", `${o.displayName || "This user"} will lose owner access.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeOwner(o.uid).catch((e) => Alert.alert("Failed", e.message)) },
    ]);

  return (
    <FlatList
      data={owners}
      keyExtractor={(o) => o.uid}
      contentContainerStyle={common.list}
      ListHeaderComponent={<Button title="+ Add owner" onPress={() => navigation.navigate("AddOwner")} />}
      renderItem={({ item: o }) => (
        <View style={[common.card, common.row]}>
          <Avatar name={o.displayName || "?"} />
          <Text style={[common.title, { flex: 1 }]}>
            {o.displayName || o.uid}
            {o.uid === user.uid ? " (you)" : ""}
          </Text>
          {o.uid !== user.uid && <Button small variant="danger" title="Remove" onPress={() => confirmRemove(o)} />}
        </View>
      )}
    />
  );
}
