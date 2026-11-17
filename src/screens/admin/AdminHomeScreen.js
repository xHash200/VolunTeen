import { useLayoutEffect, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { removeTeamMember, ROLES, useApplications, useTeam } from "../../admin/api";
import { CONTENT_TYPES, organizerOf } from "../../admin/contentSchemas";
import { useData } from "../../data/DataContext";
import { Avatar, Button, Chips, Segmented } from "../../components/ui";
import { colors, common, formatDate } from "../../theme";

export default function AdminHomeScreen({ navigation }) {
  const { isOwner, isStaff } = useAuth();
  const [tab, setTab] = useState("events");
  useLayoutEffect(() => navigation.setOptions({ title: isStaff ? "Admin" : "My events" }), [navigation, isStaff]);
  const tabs = [
    { value: "events", label: "Events" },
    ...(isStaff
      ? [
          { value: "orgs", label: "Orgs" },
          { value: "content", label: "Content" },
        ]
      : []),
    ...(isOwner ? [{ value: "team", label: "Team" }] : []),
  ];
  return (
    <View style={common.screen}>
      {tabs.length > 1 && <Segmented options={tabs} value={tab} onChange={setTab} />}
      {tab === "events" && <ManageEvents navigation={navigation} />}
      {tab === "orgs" && isStaff && <OrgRequests navigation={navigation} />}
      {tab === "content" && isStaff && <Content navigation={navigation} />}
      {tab === "team" && isOwner && <Team navigation={navigation} />}
    </View>
  );
}

// Staff see every event; organizers only the events they created.
function ManageEvents({ navigation }) {
  const { profile, isStaff, canEditEvent } = useAuth();
  const { events, jobs, leagueById } = useData();
  const mine = events.filter((e) => canEditEvent(e)).sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return (
    <FlatList
      data={mine}
      keyExtractor={(e) => e.id}
      contentContainerStyle={common.list}
      ListHeaderComponent={
        <Button
          title="+ Create event"
          onPress={() => navigation.navigate("ContentEdit", { type: "events", preset: { leagueId: profile?.leagueId ?? "" } })}
        />
      }
      ListEmptyComponent={
        <Text style={common.empty}>
          {isStaff ? "No events yet." : "You haven't created any events yet. Create one and add the volunteer roles you need."}
        </Text>
      }
      renderItem={({ item: e }) => {
        const roles = jobs.filter((j) => j.eventId === e.id);
        const spots = roles.reduce((sum, j) => sum + (Number(j.spots) || 0), 0);
        return (
          <Pressable style={common.card} onPress={() => navigation.navigate("ManageEvent", { eventId: e.id, title: e.title })}>
            <Text style={common.title}>{e.title}</Text>
            <Text style={common.meta}>{[formatDate(e.date), organizerOf(e, leagueById)].filter(Boolean).join(" · ")}</Text>
            <Text style={{ color: colors.accent, fontWeight: "600", marginTop: 2 }}>
              {roles.length} role{roles.length === 1 ? "" : "s"} · {spots} spots — manage →
            </Text>
          </Pressable>
        );
      }}
    />
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
            options={Object.entries(CONTENT_TYPES)
              .filter(([value]) => value !== "events") // events have their own section
              .map(([value, t]) => ({ value, label: t.plural }))}
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
      <TeamSection role="organizers" navigation={navigation} />
      <Text style={common.meta}>Verified organizations are organizers automatically.</Text>
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
