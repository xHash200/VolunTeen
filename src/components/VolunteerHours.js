import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVolunteerHours } from "../attendance/api";
import { colors, common, formatDate, themed } from "../theme";

const fmt = (h) => String(Math.round(h * 100) / 100).replace(".", ",");

// "Volunteer hours" card: hours confirmed by organizers after each event (attendance/*).
// `mine` = the person's own profile (also shows no-shows, and the card even with no hours yet).
export default function VolunteerHoursCard({ uid, mine = false }) {
  const record = useVolunteerHours(uid);
  if (record === undefined) return null;
  if (!mine && record.entries.length === 0) return null;

  return (
    <View style={[common.card, { gap: 8 }]}>
      <View style={[common.row, { gap: 8 }]}>
        <Ionicons name="time-outline" size={20} color={colors.accent} />
        <Text style={[common.title, { flex: 1 }]}>Volunteer hours</Text>
        <Text style={styles.verified}>✓ Verified</Text>
      </View>
      <View style={styles.stats}>
        <Stat value={fmt(record.totalHours)} label="hours" />
        <Stat value={record.events} label={record.events === 1 ? "event" : "events"} />
        {mine && record.noShows > 0 && <Stat value={record.noShows} label={record.noShows === 1 ? "no-show" : "no-shows"} />}
      </View>
      {record.entries.map((a) => (
          <View key={a.id} style={styles.entry}>
            <View style={{ flex: 1 }}>
              <Text style={common.body} numberOfLines={1}>
                {a.eventTitle || "Event"}
              </Text>
              <Text style={[common.meta, { fontSize: 12 }]} numberOfLines={1}>
                {[a.roleTitle, a.date && formatDate(a.date), a.orgName].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <Text style={styles.hours}>{fmt(a.hours)} h</Text>
          </View>
        ))}
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={common.meta}>{label}</Text>
    </View>
  );
}

const styles = themed((colors) => StyleSheet.create({
  verified: { color: "#1e8a4c", fontWeight: "700", fontSize: 12 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: colors.bg },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  entry: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 },
  hours: { fontWeight: "700", color: colors.accent },
}));
