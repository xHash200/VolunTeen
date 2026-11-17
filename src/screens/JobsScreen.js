import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useData } from "../data/DataContext";
import { colors, common, formatDate } from "../theme";

export default function JobsScreen({ navigation, route }) {
  const { jobs, leagues, leagueById, eventById, loading } = useData();
  const [query, setQuery] = useState("");
  const leagueFilter = route.params?.leagueId ?? "";
  const setLeagueFilter = (id) => navigation.setParams({ leagueId: id });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs
      .filter(
        (j) =>
          (!leagueFilter || j.leagueId === leagueFilter) &&
          (!q || `${j.title} ${j.event} ${j.description}`.toLowerCase().includes(q))
      )
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [jobs, query, leagueFilter]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />;

  return (
    <View style={common.screen}>
      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          placeholder="Search jobs or events…"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {[{ id: "", name: "All leagues" }, ...leagues].map((l) => (
            <Pressable
              key={l.id || "all"}
              onPress={() => setLeagueFilter(l.id)}
              style={[styles.chip, leagueFilter === l.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, leagueFilter === l.id && styles.chipTextActive]}>{l.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(j) => String(j.id)}
        contentContainerStyle={common.list}
        ListEmptyComponent={<Text style={common.empty}>No jobs match your search.</Text>}
        renderItem={({ item: j }) => (
          <Pressable style={common.card} onPress={() => navigation.navigate("JobDetail", { jobId: j.id })}>
            <Text style={common.tag}>{j.category}</Text>
            <Text style={common.title}>{j.title}</Text>
            <Text style={common.meta}>{j.event}</Text>
            <Text style={common.meta}>
              {formatDate(j.date)} · {j.hours} · {j.location}
            </Text>
            <Text style={common.meta}>
              {leagueById[j.leagueId]?.name || eventById[j.eventId]?.organizerName || ""} · {j.spots} spots
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { paddingTop: 12, gap: 10, backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.border },
  search: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  chips: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextActive: { color: "#fff" },
});
