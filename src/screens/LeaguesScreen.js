import { FlatList, Linking, Pressable, StyleSheet, Text } from "react-native";
import { useData } from "../data/DataContext";
import { colors, common } from "../theme";

export default function LeaguesScreen({ navigation }) {
  const { leagues, jobs } = useData();

  return (
    <FlatList
      style={common.screen}
      data={leagues}
      keyExtractor={(l) => l.id}
      contentContainerStyle={common.list}
      ListHeaderComponent={<Text style={common.meta}>Student leagues from Timișoara faculties.</Text>}
      ListEmptyComponent={<Text style={common.empty}>No leagues yet.</Text>}
      renderItem={({ item: l }) => {
        const count = jobs.filter((j) => j.leagueId === l.id).length;
        return (
          <Pressable style={common.card} onPress={() => navigation.navigate("JobsTab", { screen: "Jobs", params: { leagueId: l.id } })}>
            {!l.verified && <Text style={[common.tag, styles.warn]}>Needs verification</Text>}
            <Text style={common.title}>{l.name}</Text>
            <Text style={common.meta}>{l.fullName}</Text>
            <Text style={common.meta}>
              {l.university} · {l.faculty}
            </Text>
            <Text style={common.body}>{l.description}</Text>
            {!!l.website && (
              <Text style={styles.link} onPress={() => Linking.openURL(l.website)}>
                Website
              </Text>
            )}
            <Text style={styles.count}>
              {count} open job{count === 1 ? "" : "s"} →
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  warn: { backgroundColor: colors.warnBg, color: colors.warnText },
  link: { color: colors.accent, fontSize: 15 },
  count: { color: colors.accent, fontWeight: "600", marginTop: 4 },
});
