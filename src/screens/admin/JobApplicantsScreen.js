import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../data/DataContext";
import { setApplicationStatus, syncAcceptedCount, useJobApplications } from "../../applications/api";
import { Avatar, Button } from "../../components/ui";
import { colors, common } from "../../theme";
import { ORGANIZER_CATEGORY } from "../../config";

// Review one volunteer role: its waiting list, accepted and declined volunteers.
// The event's organization (and staff) can do everything; event helpers (accepted "Organizer"s)
// can accept/decline for the event's other roles, but not for Organizer roles and can't edit the role.
export default function JobApplicantsScreen({ route, navigation }) {
  const { jobs, eventById } = useData();
  const { user, canEditEvent, canReviewEvent } = useAuth();
  const job = jobs.find((j) => String(j.id) === String(route.params.jobId));
  const event = eventById[job?.eventId];
  const canEdit = canEditEvent(event);
  const allowed = Boolean(job) && (canEdit || (canReviewEvent(event) && job.category !== ORGANIZER_CATEGORY));
  const apps = useJobApplications(allowed ? job.id : null);
  const [busyId, setBusyId] = useState(null);

  const accepted = (apps ?? []).filter((a) => a.status === "accepted");

  // Keep the public "spots left" counter correct (e.g. if a write was interrupted).
  useEffect(() => {
    if (allowed && apps && (Number(job.acceptedCount) || 0) !== accepted.length) {
      syncAcceptedCount(job.id, accepted.length).catch((e) => console.warn("Count sync failed:", e.message));
    }
  }, [allowed, job?.id, job?.acceptedCount, apps, accepted.length]);

  if (!job) return <Text style={common.empty}>This role no longer exists.</Text>;
  if (!allowed) {
    return (
      <Text style={common.empty}>
        {job.category === ORGANIZER_CATEGORY && canReviewEvent(event)
          ? "Only the organization can choose who becomes an Organizer."
          : "You can only manage roles of your own events."}
      </Text>
    );
  }

  const spots = Number(job.spots) || 0;
  const decide = async (app, status) => {
    setBusyId(app.id);
    try {
      await setApplicationStatus(job, app, status, user.uid);
    } catch (e) {
      Alert.alert("Couldn't update", e.message);
    } finally {
      setBusyId(null);
    }
  };
  const accept = (app) => {
    if (spots > 0 && accepted.length >= spots) {
      Alert.alert("All spots are filled", `Accept ${app.name} anyway? This goes over the ${spots} spots.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Accept anyway", onPress: () => decide(app, "accepted") },
      ]);
    } else decide(app, "accepted");
  };

  const groups = [
    ["Waiting list", "pending", "No one is waiting."],
    ["Accepted", "accepted", "No accepted volunteers yet."],
    ["Declined", "declined", null],
  ];

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list}>
      <View style={[common.card, { gap: 6 }]}>
        <Text style={[common.title, { fontSize: 20 }]}>{job.title}</Text>
        <Text style={common.meta}>
          {accepted.length} of {spots} spots filled
        </Text>
        {canEdit && (
          <Button
            small
            variant="secondary"
            title="Edit role details"
            onPress={() => navigation.navigate("ContentEdit", { type: "jobs", id: job.id })}
            style={{ alignSelf: "flex-start", marginTop: 6 }}
          />
        )}
      </View>

      {apps === undefined && <Text style={common.meta}>Loading applicants…</Text>}
      {apps &&
        groups.map(([title, status, emptyText]) => {
          const list = apps.filter((a) => (a.status ?? "pending") === status);
          if (!list.length && !emptyText) return null;
          return (
            <View key={status} style={{ gap: 8 }}>
              <Text style={common.sectionTitle}>
                {title} ({list.length})
              </Text>
              {!list.length && <Text style={common.meta}>{emptyText}</Text>}
              {list.map((a, i) => (
                <View key={a.id} style={[common.card, common.row]}>
                  <Pressable
                    style={[common.row, { flex: 1 }]}
                    onPress={() => navigation.navigate("ApplicantProfile", { uid: a.id, name: a.name, status })}
                  >
                  <Avatar name={a.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={common.title}>
                      {status === "pending" ? `${i + 1}. ` : ""}
                      {a.name}
                    </Text>
                    {!!a.appliedAt?.toDate && (
                      <Text style={[common.meta, { fontSize: 12 }]}>
                        Applied {a.appliedAt.toDate().toLocaleDateString("ro-RO")},{" "}
                        {a.appliedAt.toDate().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    )}                  </View>
                  </Pressable>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {status !== "accepted" && (
                      <Button small title="Accept" loading={busyId === a.id} onPress={() => accept(a)} />
                    )}
                    {status !== "declined" && (
                      <Button small variant="danger" title="Decline" disabled={busyId === a.id} onPress={() => decide(a, "declined")} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          );
        })}
      <Text style={[common.meta, { fontSize: 12, color: colors.muted }]}>
        The waiting list is in the order people applied.
      </Text>
    </ScrollView>
  );
}
