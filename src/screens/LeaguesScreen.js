import { Linking, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { useData } from "../data/DataContext";
import { useVerifiedOrgs } from "../data/orgs";
import { NameWithTag } from "../components/RoleTag";
import { Avatar } from "../components/ui";
import { colors, common, themed } from "../theme";

// Student leagues, then every verified organization (they run events in the app too).
export default function LeaguesScreen({ navigation }) {
  const { leagues, jobs, events } = useData();
  const orgs = useVerifiedOrgs();
  const leagueById = Object.fromEntries(leagues.map((l) => [l.id, l]));
  const orgById = Object.fromEntries(orgs.map((o) => [o.id, o]));
  // A league claimed by a verified organization (leagues.orgUid) is shown once, here, as "Managed by" it.
  // A claim by an account that's no longer verified is ignored.
  const managerOf = (l) => (l.orgUid ? orgById[l.orgUid] : null);
  const claimedOrgIds = new Set(leagues.map((l) => managerOf(l)?.id).filter(Boolean));
  const otherOrgs = orgs.filter((o) => !claimedOrgIds.has(o.id));

  const sections = [
    { key: "leagues", title: "Student leagues", data: leagues, empty: "No leagues yet." },
    { key: "orgs", title: "Verified organizations", data: otherOrgs, empty: "No other verified organizations yet." },
  ];

  const openProfile = (o) => navigation.navigate("UserProfile", { uid: o.id, name: o.displayName });

  const renderLeague = (l) => {
    const count = jobs.filter((j) => j.leagueId === l.id).length;
    const manager = managerOf(l);
    return (
      <Pressable style={common.card} onPress={() => navigation.navigate("JobsTab", { screen: "Jobs", params: { leagueId: l.id } })}>
        {!l.verified && !manager && <Text style={[common.tag, styles.warn]}>Needs verification</Text>}
        {!!manager && (
          <Pressable
            onPress={() => openProfile(manager)}
            style={[common.row, styles.manager]}
            accessibilityRole="button"
            accessibilityLabel={`Managed by ${manager.displayName}. Open profile`}
          >
            <Text style={common.meta}>Managed by</Text>
            <NameWithTag kind="organization" small name={manager.displayName} textStyle={styles.managerName} style={{ flex: 1 }} />
          </Pressable>
        )}
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
  };

  const renderOrg = (o) => {
    const count = events.filter((e) => e.createdBy === o.id).length;
    const league = leagueById[o.leagueId]?.name;
    return (
      <Pressable
        style={[common.card, { gap: 6 }]}
        onPress={() => openProfile(o)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${o.displayName}'s profile`}
      >
        <View style={common.row}>
          <Avatar name={o.displayName} photo={o.photo} />
          <View style={{ flex: 1, gap: 2 }}>
            <NameWithTag kind="organization" name={o.displayName} textStyle={common.title} />
            {!!(o.faculty || league) && <Text style={common.meta}>{[league, o.faculty].filter(Boolean).join(" · ")}</Text>}
          </View>
        </View>
        {!!o.bio && <Text style={common.body}>{o.bio}</Text>}
        <Text style={styles.count}>
          {count} event{count === 1 ? "" : "s"} →
        </Text>
      </Pressable>
    );
  };

  return (
    <SectionList
      style={common.screen}
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={common.list}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={<Text style={common.meta}>Student leagues and organizations from Timișoara.</Text>}
      renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 ? <Text style={common.empty}>{section.empty}</Text> : null
      }
      renderItem={({ item, section }) => (section.key === "orgs" ? renderOrg(item) : renderLeague(item))}
    />
  );
}

const styles = themed((colors) => StyleSheet.create({
  warn: { backgroundColor: colors.warnBg, color: colors.warnText },
  link: { color: colors.accent, fontSize: 15 },
  count: { color: colors.accent, fontWeight: "600", marginTop: 4 },
  manager: { gap: 6, alignSelf: "stretch" },
  managerName: { color: colors.accent, fontWeight: "700", fontSize: 14 },
  section: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginTop: 8 },
}));
