import { useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { approveOrg, claimFor, claimLeague, rejectOrg, unclaimLeague, useApplication } from "../../admin/api";
import { useData } from "../../data/DataContext";
import { useVerifiedOrgs } from "../../data/orgs";
import { STUDENT_LEAGUE } from "../../config";
import { Badge, Button, Field } from "../../components/ui";
import { colors, common, themed } from "../../theme";

const withScheme = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export default function OrgReviewScreen({ route }) {
  const { uid } = route.params;
  const { user } = useAuth();
  const { leagueById } = useData();
  const app = useApplication(uid);
  const orgs = useVerifiedOrgs();
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

  // League claiming: a "Student league" organization takes over the league it picked, if no one else has.
  const claim = claimFor(app, leagueById);
  const holder = claim.state === "taken" ? orgs.find((o) => o.id === claim.league.orgUid) : null;
  const claimText = {
    free:
      app.status === "verified"
        ? `${claim.league?.name} isn't linked to this account yet.`
        : `Approving links ${claim.league?.name} to this account: it shows as verified and "Managed by" them.`,
    mine: `${claim.league?.name} is managed by this account.`,
    taken: `${claim.league?.name} is already managed by ${holder?.displayName ?? "another account"}. Approving won't link it — unlink it there first if this is the real league.`,
  }[claim.state];
  const claimLeagueId = claim.state === "free" || claim.state === "mine" ? claim.league.id : null;

  const approve = run("approve", () => approveOrg(uid, user.uid, claimLeagueId));
  const unlink = () =>
    Alert.alert("Unlink league?", `${claim.league.name} will no longer be managed by ${app.orgName}.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Unlink", style: "destructive", onPress: run("unlink", () => unclaimLeague(claim.league.id)) },
    ]);
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
        {!!claimText && (
          <Text style={[common.meta, claim.state === "taken" && styles.warn]}>{claimText}</Text>
        )}
        {/* Organizations approved before claiming existed: link without re-approving. */}
        {claim.state === "free" && app.status === "verified" && (
          <Button
            title={`Link ${claim.league.name}`}
            variant="secondary"
            onPress={run("link", () => claimLeague(claim.league.id, uid))}
            loading={busy === "link"}
          />
        )}
        {claim.state === "mine" && (
          <Button title="Unlink league" variant="secondary" onPress={unlink} loading={busy === "unlink"} />
        )}
        {app.orgType !== STUDENT_LEAGUE && !!app.leagueId && (
          <Text style={common.meta}>Only "{STUDENT_LEAGUE}" organizations take over a league; this one just mentions it.</Text>
        )}
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

const styles = themed((colors) => StyleSheet.create({
  link: { color: colors.accent },
  warn: { color: colors.warnText },
  code: { fontSize: 24, fontWeight: "800", letterSpacing: 2, textAlign: "center", color: colors.text },
}));
