import { useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { approveOrg, rejectOrg, useApplication } from "../../admin/api";
import { useData } from "../../data/DataContext";
import { Badge, Button, Field } from "../../components/ui";
import { colors, common } from "../../theme";

const withScheme = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export default function OrgReviewScreen({ route }) {
  const { uid } = route.params;
  const { user } = useAuth();
  const { leagueById } = useData();
  const app = useApplication(uid);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(null);

  if (app === undefined) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />;
  if (app === null) return <Text style={common.empty}>Application not found.</Text>;

  const run = (kind, fn) => async () => {
    setBusy(kind);
    try {
      await fn();
      setReason("");
    } catch (e) {
      Alert.alert("Failed", e.message);
    } finally {
      setBusy(null);
    }
  };

  const approve = run("approve", () => approveOrg(uid, user.uid));
  const reject = () => {
    if (!reason.trim()) return Alert.alert("Add a reason", "Tell the organization why, so they can fix it.");
    run("reject", () => rejectOrg(uid, user.uid, reason))();
  };

  const row = (label, value, link) =>
    !!value && (
      <View style={{ gap: 2 }}>
        <Text style={common.label}>{label}</Text>
        <Text style={[common.body, link && styles.link]} onPress={link ? () => Linking.openURL(link) : undefined} selectable>
          {value}
        </Text>
      </View>
    );

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list}>
      <View style={[common.card, { alignItems: "center", gap: 6 }]}>
        <Text style={[common.title, { fontSize: 20, textAlign: "center" }]}>{app.orgName}</Text>
        <Badge kind={app.status} />
      </View>

      <View style={[common.card, { gap: 6 }]}>
        <Text style={common.sectionTitle}>Verification checks</Text>
        <Text style={common.body}>{app.emailVerified ? "✓ Email confirmed" : "✗ Email not confirmed yet"}</Text>
        <Text style={common.body}>Code they must send from their official page/email:</Text>
        <Text selectable style={styles.code}>
          {app.verificationCode}
        </Text>
        <Text style={common.meta}>Approve only after you received this code from the page or email listed below.</Text>
      </View>

      <View style={[common.card, { gap: 6 }]}>
        <Text style={common.sectionTitle}>Organization</Text>
        {row("Type", app.orgType)}
        {row("University", app.university)}
        {row("Faculty", app.faculty)}
        {row("Claims to be league", leagueById[app.leagueId]?.name)}
        {row("Website", app.website, app.website && withScheme(app.website))}
        {row("Social page", app.socialUrl, app.socialUrl && withScheme(app.socialUrl))}
        {row("Notes", app.notes)}
      </View>

      <View style={[common.card, { gap: 6 }]}>
        <Text style={common.sectionTitle}>Contact</Text>
        {row("Person", `${app.contactName} — ${app.contactRole}`)}
        {row("Phone", app.phone, `tel:${app.phone.replace(/\s/g, "")}`)}
        {row("Email", app.contactEmail, `mailto:${app.contactEmail}`)}
      </View>

      {app.status === "rejected" && !!app.rejectReason && (
        <View style={common.card}>
          <Text style={common.label}>Rejected because</Text>
          <Text style={common.body}>{app.rejectReason}</Text>
        </View>
      )}

      {app.status !== "verified" && <Button title="Approve organization" onPress={approve} loading={busy === "approve"} />}
      {app.status !== "rejected" && (
        <View style={{ gap: 8 }}>
          <Field
            label={app.status === "verified" ? "Revoke verification — reason" : "Reject — reason"}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. We couldn't confirm the Instagram page"
            multiline
          />
          <Button
            title={app.status === "verified" ? "Revoke verification" : "Reject"}
            variant="danger"
            onPress={reject}
            loading={busy === "reject"}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.accent },
  code: { fontSize: 24, fontWeight: "800", letterSpacing: 2, textAlign: "center", color: colors.text },
});
