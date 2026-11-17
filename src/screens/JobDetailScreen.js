import { ScrollView, Text } from "react-native";
import { useData } from "../data/DataContext";
import { common, formatDate } from "../theme";

export default function JobDetailScreen({ route }) {
  const { jobs, leagueById, eventById } = useData();
  const job = jobs.find((j) => String(j.id) === String(route.params.jobId));

  if (!job) return <Text style={common.empty}>This job is no longer available.</Text>;

  const organizer = leagueById[job.leagueId]?.name || eventById[job.eventId]?.organizerName || "—";
  const section = (title, items = []) =>
    items.length > 0 && (
      <>
        <Text style={[common.title, { marginTop: 12 }]}>{title}</Text>
        {items.map((i) => (
          <Text key={i} style={common.body}>• {i}</Text>
        ))}
      </>
    );

  return (
    <ScrollView style={common.screen} contentContainerStyle={[common.list, { gap: 6 }]}>
      <Text style={common.tag}>{job.category}</Text>
      <Text style={[common.title, { fontSize: 22 }]}>{job.title}</Text>
      <Text style={common.meta}>
        {job.event} · organized by {organizer}
      </Text>
      <Text style={common.meta}>
        {formatDate(job.date)} · {job.hours} · {job.location} · {job.spots} spots
      </Text>
      <Text style={[common.body, { marginTop: 8 }]}>{job.description}</Text>
      {section("Requirements", job.requirements)}
      {section("Perks", job.perks)}
    </ScrollView>
  );
}
