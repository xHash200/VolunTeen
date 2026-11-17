import { useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { removeTeamMember, ROLES, useApplications, useTeam } from "../../admin/api";
import { CONTENT_TYPES } from "../../admin/contentSchemas";
import { useData } from "../../data/DataContext";
import { Avatar, Button, Chips, Segmented } from "../../components/ui";
import { common } from "../../theme";

export default function AdminHomeScreen({ navigation }) {
  const { isOwner } = useAuth();
  const [tab, setTab] = useState("orgs");
  const tabs = [
    { value: "orgs", label: "Organizations" },
    { value: "content", label: "Content" },
    ...(isOwner ? [{ value: "team", label: "Team" }] : []),
  ];
  return (
    <View style={common.screen}>
      <Segmented options={tabs} value={tab} onChange={setTab} />
      {tab === "orgs" && <OrgRequests navigation={navigation} />}
      {tab === "content" && <Content navigation={navigation} />}
      {tab === "team" && isOwner && <Team navigation={navigation} />}
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

function Content({ navigation }) {
  const data = useData();
  const [type, setType] = useState("jobs");
  const schema = CONTENT_TYPES[type];
  const items = [...data[type]].sort((a, b) => String(a[schema.titleKey]).localeCompare(String(b[schema.titleKey])));

  return (
    <FlatList
      data={items}
      keyExtractor={(x) => String(x.id)}
      contentContainerStyle={common.list}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Chips
            options={Object.entries(CONTENT_TYPES).map(([value, t]) => ({ value, label: t.plural }))}
            value={type}
            onChange={setType}
          />
          <Button title={`+ Add ${schema.label.toLowerCase()}`} onPress={() => navigation.navigate("ContentEdit", { type })} />
        </View>
      }
      ListEmptyComponent={<Text style={common.empty}>No {schema.plural.toLowerCase()} yet.</Text>}
      renderItem={({ item }) => (
        <Pressable style={common.card} onPress={() => navigation.navigate("ContentEdit", { type, id: item.id })}>
          <Text style={common.title}>{item[schema.titleKey]}</Text>
          <Text style={common.meta}>{schema.subtitle(item, data)}</Text>
        </Pressable>
      )}
    />
  );
}

function Team({ navigation }) {
  return (
    <ScrollView contentContainerStyle={common.list}>
      <TeamSection role="owners" navigation={navigation} />
      <TeamSection role="testers" navigation={navigation} />
    </ScrollView>
  );
}

function TeamSection({ role, navigation }) {
  const { user } = useAuth();
  const members = useTeam(role);
  const { label, plural } = ROLES[role];

  const confirmRemove = (m) =>
    Alert.alert(`Remove ${label.toLowerCase()}?`, `${m.displayName || "This user"} will lose ${label.toLowerCase()} access.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeTeamMember(role, m.uid).catch((e) => Alert.alert("Failed", e.message)) },
    ]);

  return (
    <View style={{ gap: 10 }}>
      <Text style={common.sectionTitle}>
        {plural} ({members.length})
      </Text>
      {members.map((m) => (
        <View key={m.uid} style={[common.card, common.row]}>
          <Avatar name={m.displayName || "?"} />
          <Text style={[common.title, { flex: 1 }]} numberOfLines={1}>
            {m.displayName || m.uid}
            {m.uid === user.uid ? " (you)" : ""}
          </Text>
          {m.uid !== user.uid && <Button small variant="danger" title="Remove" onPress={() => confirmRemove(m)} />}
        </View>
      ))}
      <Button variant="secondary" title={`+ Add ${label.toLowerCase()}`} onPress={() => navigation.navigate("AddTeamMember", { role })} />
    </View>
  );
}
