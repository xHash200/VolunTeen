import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useData } from "../data/DataContext";
import { useAuth } from "../auth/AuthContext";
import { applyToJob, useMyApplication, withdrawApplication } from "../applications/api";
import { db } from "../firebase";
import { Button } from "../components/ui";
import { ageFrom, colors, common, formatDate } from "../theme";

export default function JobDetailScreen({ route }) {
  const { jobs, leagueById, eventById } = useData();
  const job = jobs.find((j) => String(j.id) === String(route.params.jobId));

  if (!job) return <Text style={common.empty}>This job is no longer available.</Text>;

  const organizer = leagueById[job.leagueId]?.name || eventById[job.eventId]?.organizerName || "—";
  const spots = Number(job.spots) || 0;
  const spotsLeft = Math.max(0, spots - (Number(job.acceptedCount) || 0));
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
        {formatDate(job.date)} · {job.hours} · {job.location} · {spotsLeft} of {spots} spots left
      </Text>
      <ApplyBox job={job} full={spots > 0 && spotsLeft === 0} />
      <Text style={[common.body, { marginTop: 8 }]}>{job.description}</Text>
      {section("Requirements", job.requirements)}
      {section("Perks", job.perks)}
    </ScrollView>
  );
}

const STATUS = {
  pending: {
    text: "On the waiting list · waiting for the organizer's approval",
    get bg() { return colors.warnBg; },
    get fg() { return colors.warnText; },
  },
  accepted: { text: "Accepted ✓ · see you there!", bg: "#e5f6ec", fg: "#1e8a4c" },
  declined: { text: "Not selected this time", bg: "#fdecec", fg: "#c0392b" },
};

function ApplyBox({ job, full }) {
  const { user, displayName, accountType, birthDate } = useAuth();
  const app = useMyApplication(job.id, user?.uid);
  const [busy, setBusy] = useState(false);

  if (!db) return <Note>Applying needs an internet connection to the app's database.</Note>;
  if (!user) return null;
  if (accountType === "organization") return <Note>Only personal accounts can apply to volunteer roles.</Note>;
  if (app === undefined) return null;

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      Alert.alert("Something went wrong", e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!app) {
    return (
      <View style={{ gap: 6, marginTop: 8 }}>
        <Button title="Apply" loading={busy} onPress={() => run(() => applyToJob(job.id, user.uid, displayName, birthDate ? ageFrom(birthDate) : null))} />
        <Text style={common.meta}>
          {full
            ? "All spots are filled, but you can still join the waiting list in case someone drops out."
            : "You'll join the waiting list until the organizer approves you."}
        </Text>
      </View>
    );
  }

  const s = STATUS[app.status] ?? STATUS.pending;
  const withdraw = () =>
    Alert.alert("Withdraw application?", "You'll lose your place on the list.", [
      { text: "Keep", style: "cancel" },
      { text: "Withdraw", style: "destructive", onPress: () => run(() => withdrawApplication(job, user.uid, app.status === "accepted")) },
    ]);

  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      <Text style={[common.tag, { backgroundColor: s.bg, color: s.fg, fontSize: 14, paddingVertical: 6 }]}>{s.text}</Text>
      {app.status !== "declined" && (
        <Button small variant="danger" title="Withdraw" loading={busy} onPress={withdraw} style={{ alignSelf: "flex-start" }} />
      )}
    </View>
  );
}

const Note = ({ children }) => <Text style={[common.meta, { marginTop: 8, fontStyle: "italic" }]}>{children}</Text>;
