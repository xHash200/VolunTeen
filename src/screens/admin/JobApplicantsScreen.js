import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { useData } from "../../data/DataContext";
import { setApplicationStatus, syncAcceptedCount, useJobApplications } from "../../applications/api";
import { syncEventChatRole } from "../../chat/api";
import {
  attendanceOpen,
  clearAttendance,
  CONFIRM_HOURS_ABOVE,
  hoursFromRange,
  markAttendance,
  MAX_HOURS,
  parseHours,
  useJobAttendance,
} from "../../attendance/api";
import { Avatar, Button } from "../../components/ui";
import { colors, common, formatDate, themed } from "../../theme";
import { ORGANIZER_CATEGORY } from "../../config";

const fmtHours = (h) => `${String(h).replace(".", ",")} h`;

// Under an accepted volunteer: "Attended" (with hours) / "No-show", or the saved mark with Change / Undo.
function AttendanceControls({ job, event, app, record, markerUid }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const defaultHours = hoursFromRange(job.hours);

  useEffect(() => {
    if (!editing) setText(String(record?.attended ? record.hours : defaultHours ?? "").replace(".", ","));
  }, [record?.attended, record?.hours, defaultHours, editing]);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      setEditing(false);
    } catch (e) {
      Alert.alert("Couldn't save attendance", e.message);
    } finally {
      setBusy(false);
    }
  };
  const attended = () => {
    const hours = parseHours(text);
    if (hours == null) return Alert.alert("Hours", `Enter how many hours they volunteered (more than 0, at most ${MAX_HOURS}).`);
    const save = () => run(() => markAttendance({ job, event, app, attended: true, hours, markerUid }));
    if (hours <= CONFIRM_HOURS_ABOVE) return save();
    Alert.alert(
      `${fmtHours(hours)} for ${app.name}?`,
      `That's more than ${CONFIRM_HOURS_ABOVE} hours for one role. Check it's not a typo — it goes on their profile.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: `Yes, ${fmtHours(hours)}`, onPress: save },
      ]
    );
  };
  const noShow = () => run(() => markAttendance({ job, event, app, attended: false, hours: 0, markerUid }));
  const undo = () => run(() => clearAttendance(job.id, app.id));

  if (record && !editing) {
    return (
      <View style={[common.row, styles.att]}>
        <Text style={[styles.attText, record.attended ? styles.ok : styles.bad]}>
          {record.attended ? `✓ Attended · ${fmtHours(record.hours)}` : "✗ No-show"}
        </Text>
        <Button small variant="secondary" title="Change" disabled={busy} onPress={() => setEditing(true)} />
        <Button small variant="secondary" title="Undo" loading={busy} onPress={undo} />
      </View>
    );
  }
  return (
    <View style={[common.row, styles.att]}>
      <TextInput
        style={[common.input, styles.hours]}
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        placeholder="h"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Hours volunteered"
      />
      <Text style={common.meta}>h</Text>
      <Button small title="Attended" loading={busy} onPress={attended} style={{ flex: 1 }} />
      <Button small variant="danger" title="No-show" disabled={busy} onPress={noShow} style={{ flex: 1 }} />
      {editing && <Button small variant="secondary" title="Cancel" disabled={busy} onPress={() => setEditing(false)} />}
    </View>
  );
}

const styles = themed((colors) => StyleSheet.create({
  att: { gap: 6, borderTopWidth: 1, borderColor: colors.border, paddingTop: 10 },
  attText: { flex: 1, fontWeight: "700", fontSize: 14 },
  ok: { color: "#1e8a4c" },
  bad: { color: "#c0392b" },
  hours: { width: 56, paddingVertical: 6, textAlign: "center" },
}));

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
  const attendance = useJobAttendance(allowed ? job.id : null);
  const [busyId, setBusyId] = useState(null);
  const roleDate = job?.date || event?.date || "";
  const open = attendanceOpen(roleDate);

  const accepted = (apps ?? []).filter((a) => a.status === "accepted");

  // Keep the public "spots left" counter correct (e.g. if a write was interrupted).
  useEffect(() => {
    if (allowed && apps && (Number(job.acceptedCount) || 0) !== accepted.length) {
      syncAcceptedCount(job.id, accepted.length).catch((e) => console.warn("Count sync failed:", e.message));
    }
  }, [allowed, job?.id, job?.acceptedCount, apps, accepted.length]);

  // Event group chat: make sure everyone accepted here is in it (people accepted before it existed, or a missed write).
  const acceptedKey = accepted.map((a) => a.id).sort().join(",");
  useEffect(() => {
    if (!allowed || !apps || !event || !accepted.length) return;
    syncEventChatRole(event, String(job.id), accepted).catch((e) => console.warn("Event chat sync failed:", e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, job?.id, event?.id, acceptedKey]);

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
      await setApplicationStatus(job, app, status, user.uid, event);
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
        {/* Verified hours: mark who actually came, from the event day on. */}
        <Text style={[common.meta, { fontSize: 12 }]}>
          {open
            ? attendance && accepted.length
              ? `Attendance: ${accepted.filter((a) => attendance[a.id]).length} of ${accepted.length} marked. Their hours appear on their profile.`
              : "Attendance is open: mark accepted volunteers as attended or no-show."
            : `Attendance opens on the event day (${formatDate(roleDate)}).`}
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
                <View key={a.id} style={[common.card, { gap: 10 }]}>
                <View style={common.row}>
                  <Pressable
                    style={[common.row, { flex: 1 }]}
                    onPress={() => navigation.navigate("ApplicantProfile", { uid: a.id, name: a.name, status, age: a.age ?? null })}
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
                {status === "accepted" && attendance && open && (
                  <AttendanceControls job={job} event={event} app={a} record={attendance[a.id]} markerUid={user.uid} />
                )}
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
