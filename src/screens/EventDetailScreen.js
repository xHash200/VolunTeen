import { Pressable, ScrollView, Text } from "react-native";
import { useData } from "../data/DataContext";
import { common, formatDate } from "../theme";

export default function EventDetailScreen({ route, navigation }) {
  const { eventById, jobs, leagueById } = useData();
  const event = eventById[route.params.eventId];

  if (!event) return <Text style={common.empty}>This event is no longer available.</Text>;

  const roles = jobs.filter((j) => j.eventId === event.id);

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list}>
      <Text style={common.tag}>{event.category}</Text>
      <Text style={[common.title, { fontSize: 22 }]}>{event.title}</Text>
      <Text style={common.meta}>
        {formatDate(event.date)} · {event.time} · {event.location}
      </Text>
      <Text style={common.meta}>Organized by {leagueById[event.leagueId]?.name ?? "—"}</Text>
      <Text style={common.body}>{event.description}</Text>

      <Text style={common.sectionTitle}>Volunteer roles</Text>
      {roles.length === 0 && <Text style={common.meta}>No volunteer roles posted yet.</Text>}
      {roles.map((j) => (
        <Pressable key={j.id} style={common.card} onPress={() => navigation.navigate("JobDetail", { jobId: j.id })}>
          <Text style={common.title}>{j.title}</Text>
          <Text style={common.meta}>
            {j.hours} · {j.spots} spots
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
