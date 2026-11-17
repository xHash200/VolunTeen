import { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, Text } from "react-native";
import { organizerOf } from "../admin/contentSchemas";
import { useData } from "../data/DataContext";
import { colors, common, formatDate } from "../theme";

export default function EventsScreen({ navigation }) {
  const { events, jobs, leagueById, loading } = useData();

  const sorted = useMemo(() => [...events].sort((a, b) => String(a.date).localeCompare(String(b.date))), [events]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />;

  return (
    <FlatList
      style={common.screen}
      data={sorted}
      keyExtractor={(e) => e.id}
      contentContainerStyle={common.list}
      ListEmptyComponent={<Text style={common.empty}>No upcoming events.</Text>}
      renderItem={({ item: e }) => {
        const openJobs = jobs.filter((j) => j.eventId === e.id).length;
        return (
          <Pressable style={common.card} onPress={() => navigation.navigate("EventDetail", { eventId: e.id })}>
            {!!e.category && <Text style={common.tag}>{e.category}</Text>}
            <Text style={common.title}>{e.title}</Text>
            <Text style={common.meta}>{[formatDate(e.date), e.time, e.location].filter(Boolean).join(" · ")}</Text>
            <Text style={common.meta}>{organizerOf(e, leagueById)}</Text>
            <Text style={{ color: colors.accent, fontWeight: "600", marginTop: 4 }}>
              {openJobs} volunteer role{openJobs === 1 ? "" : "s"} →
            </Text>
          </Pressable>
        );
      }}
    />
  );
}
