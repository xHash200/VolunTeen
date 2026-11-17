import { Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { organizerOf } from "../../admin/contentSchemas";
import { useData } from "../../data/DataContext";
import { Button } from "../../components/ui";
import { colors, common, formatDate } from "../../theme";

// Admin/organizer view of one event: edit it and manage its volunteer roles.
export default function ManageEventScreen({ route, navigation }) {
  const { eventById, jobs, leagueById } = useData();
  const { canEditEvent } = useAuth();
  const event = eventById[route.params.eventId];

  if (!event) return <Text style={common.empty}>This event no longer exists.</Text>;
  if (!canEditEvent(event)) return <Text style={common.empty}>You can only manage events you created.</Text>;

  const roles = jobs.filter((j) => j.eventId === event.id).sort((a, b) => String(a.title).localeCompare(String(b.title)));
  const totalSpots = roles.reduce((sum, j) => sum + (Number(j.spots) || 0), 0);

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list}>
      <View style={[common.card, { gap: 6 }]}>
        {!!event.category && <Text style={common.tag}>{event.category}</Text>}
        <Text style={[common.title, { fontSize: 20 }]}>{event.title}</Text>
        <Text style={common.meta}>
          {formatDate(event.date)}
          {event.time ? ` · ${event.time}` : ""}
          {event.location ? ` · ${event.location}` : ""}
        </Text>
        {!!organizerOf(event, leagueById) && <Text style={common.meta}>Organized by {organizerOf(event, leagueById)}</Text>}
        <Button
          small
          variant="secondary"
          title="Edit event details"
          onPress={() => navigation.navigate("ContentEdit", { type: "events", id: event.id })}
          style={{ alignSelf: "flex-start", marginTop: 6 }}
        />
      </View>

      <Text style={common.sectionTitle}>
        Volunteer roles ({roles.length}) · {totalSpots} spots
      </Text>
      <Button
        title="+ Add volunteer role"
        onPress={() =>
          navigation.navigate("ContentEdit", {
            type: "jobs",
            preset: { eventId: event.id, date: event.date, location: event.location, hours: event.time },
          })
        }
      />
      {roles.length === 0 && <Text style={common.meta}>No roles yet. Add the volunteers you need for this event.</Text>}
      {roles.map((j) => (
        <Pressable key={j.id} style={common.card} onPress={() => navigation.navigate("ContentEdit", { type: "jobs", id: j.id })}>
          <Text style={common.title}>{j.title}</Text>
          <Text style={common.meta}>
            {[j.hours, `${j.spots ?? 0} spots`, j.category].filter(Boolean).join(" · ")}
          </Text>
          <Text style={{ color: colors.accent, fontSize: 13 }}>Tap to edit</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
