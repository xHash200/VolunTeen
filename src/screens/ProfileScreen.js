import { useEffect, useState } from "react";
import Constants from "expo-constants";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { pickProfilePhoto } from "../profile/photo";
import { useAuth } from "../auth/AuthContext";
import { useData } from "../data/DataContext";
import { useFriendships } from "../chat/api";
import { VERIFICATION_CONTACT } from "../config";
import { Avatar, Badge, Button, Chips, Field } from "../components/ui";
import { colors, common, themed } from "../theme";

export default function ProfileScreen({ navigation }) {
  const { user, profile, displayName, isOwner, isTester, isOrganizer, isStaff, accountType, orgStatus, updateProfile, signOut } =
    useAuth();
  const { leagues, leagueById } = useData();
  const friends = useFriendships(user.uid).filter((f) => f.status === "accepted");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", faculty: "", bio: "", leagueId: "" });
  const [busy, setBusy] = useState(false);
  const isOrg = accountType === "organization";

  useEffect(() => {
    setForm({
      displayName: profile?.displayName ?? displayName,
      faculty: profile?.faculty ?? "",
      bio: profile?.bio ?? "",
      leagueId: profile?.leagueId ?? "",
    });
  }, [profile, editing]);

  const save = async () => {
    if (!form.displayName.trim()) return Alert.alert("Name can't be empty");
    setBusy(true);
    try {
      await updateProfile({ ...form, displayName: form.displayName.trim() });
      setEditing(false);
    } catch (e) {
      Alert.alert("Couldn't save", e.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const [photoBusy, setPhotoBusy] = useState(false);
  const uploadPhoto = async () => {
    setPhotoBusy(true);
    try {
      const photo = await pickProfilePhoto();
      if (photo) await updateProfile({ photo });
    } catch (e) {
      Alert.alert("Couldn't set photo", e.message);
    } finally {
      setPhotoBusy(false);
    }
  };
  const changePhoto = () => {
    if (!profile?.photo) return uploadPhoto();
    Alert.alert("Profile photo", undefined, [
      { text: "Choose new photo", onPress: uploadPhoto },
      {
        text: "Remove photo",
        style: "destructive",
        onPress: () => updateProfile({ photo: null }).catch((e) => Alert.alert("Couldn't remove photo", e.message)),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <KeyboardAvoidingView style={common.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={common.list} keyboardShouldPersistTaps="handled">
        <View style={[common.card, { alignItems: "center", gap: 8 }]}>
          <Pressable onPress={changePhoto} disabled={!editing || photoBusy} style={{ alignItems: "center", gap: 4 }}>
            <View style={{ opacity: photoBusy ? 0.5 : 1 }}>
              <Avatar name={displayName} size={88} photo={profile?.photo} />
              {photoBusy && <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.accent} />}
            </View>
            {editing && (
              <Text style={{ color: colors.accent, fontSize: 13 }}>{profile?.photo ? "Change photo" : "Add photo"}</Text>
            )}
          </Pressable>
          <Text style={[common.title, { fontSize: 20 }]}>{displayName}</Text>
          <Text style={common.meta}>{user.email}</Text>
          <View style={styles.badges}>
            {isOwner && <Badge kind="owner" />}
            {isTester && <Badge kind="tester" />}
            <Badge kind={isOrg ? orgStatus ?? "pending" : "personal"} />
          </View>
          <Text style={common.meta}>
            {friends.length} friend{friends.length === 1 ? "" : "s"}
          </Text>
        </View>

        <EmailVerificationCard />
        {isOrg && <OrgStatusCard navigation={navigation} />}

        {editing ? (
          <View style={{ gap: 10 }}>
            <Field label={isOrg ? "Organization name" : "Name"} value={form.displayName} onChangeText={set("displayName")} />
            <Field label="Faculty / school" value={form.faculty} onChangeText={set("faculty")} placeholder="e.g. Automatică și Calculatoare, UPT" />
            <Field
              label={isOrg ? "About the organization" : "About you"}
              value={form.bio}
              onChangeText={set("bio")}
              placeholder="A few words"
              multiline
            />
            <Text style={common.label}>League</Text>
            <Chips
              options={[{ value: "", label: "None" }, ...leagues.map((l) => ({ value: l.id, label: l.name }))]}
              value={form.leagueId}
              onChange={set("leagueId")}
            />
            <View style={[common.row, { marginTop: 8 }]}>
              <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }} />
              <Button title="Save" onPress={save} loading={busy} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <View style={[common.card, { gap: 4 }]}>
            <Text style={common.label}>Faculty / school</Text>
            <Text style={common.body}>{profile?.faculty || "—"}</Text>
            <Text style={common.label}>League</Text>
            <Text style={common.body}>{leagueById[profile?.leagueId]?.name || "—"}</Text>
            <Text style={common.label}>About</Text>
            <Text style={common.body}>{profile?.bio || "—"}</Text>
            <Button title="Edit profile" variant="secondary" onPress={() => setEditing(true)} style={{ marginTop: 12 }} />
          </View>
        )}

        {isStaff && <DebugCard />}

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="Switch account" variant="secondary" onPress={() => navigation.navigate("SwitchAccount")} style={{ flex: 1 }} />
          <Button title="Sign out" variant="danger" onPress={signOut} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Shown to testers and owners — handy to paste into bug reports.
function DebugCard() {
  const { user, accountType, orgStatus, isOwner, isTester, isOrganizer, emailVerified } = useAuth();
  const { source, jobs, events, leagues } = useData();
  const rows = [
    ["App version", `${Constants.expoConfig?.version ?? "?"} (${Constants.executionEnvironment ?? "?"})`],
    ["Platform", `${Platform.OS} ${Platform.Version}`],
    ["User ID", user.uid],
    // Most powerful role first.
    ["Account", [isOwner && "owner", isTester && "tester", isOrganizer && "organizer", accountType, orgStatus].filter(Boolean).join(", ")],
    ["Email verified", emailVerified ? "yes" : "no"],
    ["Data", `${source} · ${jobs.length} jobs, ${events.length} events, ${leagues.length} leagues`],
    ["Firebase project", process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "—"],
  ];
  return (
    <View style={[common.card, { gap: 4 }]}>
      <Text style={common.sectionTitle}>Debug info</Text>
      <Text selectable style={styles.debug}>
        {rows.map(([k, v]) => `${k}: ${v}`).join("\n")}
      </Text>
    </View>
  );
}

function EmailVerificationCard() {
  const { user, emailVerified, refreshEmailVerified, resendVerificationEmail } = useAuth();
  const [busy, setBusy] = useState(false);
  if (emailVerified) return null;

  const check = async () => {
    setBusy(true);
    try {
      const ok = await refreshEmailVerified();
      if (!ok) Alert.alert("Not verified yet", "Open the link in the email we sent you, then tap this button again.");
    } catch (e) {
      Alert.alert("Couldn't check", e.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = () =>
    resendVerificationEmail()
      .then(() => Alert.alert("Email sent", `Check ${user.email} (and your spam folder).`))
      .catch((e) => Alert.alert("Couldn't send", e.message));

  return (
    <View style={[common.card, styles.warnCard]}>
      <Text style={common.title}>Confirm your email</Text>
      <Text style={common.body}>We sent a link to {user.email}. Open it to confirm your address.</Text>
      <View style={common.row}>
        <Button small title="I've confirmed" onPress={check} loading={busy} />
        <Button small variant="secondary" title="Resend email" onPress={resend} />
      </View>
    </View>
  );
}

function OrgStatusCard({ navigation }) {
  const { orgStatus, application } = useAuth();

  if (orgStatus === "verified")
    return (
      <View style={[common.card, styles.okCard]}>
        <Text style={common.title}>Your organization is verified ✓</Text>
        <Text style={common.body}>
          Volunteers can see your organization as verified. You can now create events and post volunteer roles in the My events tab.
        </Text>
      </View>
    );

  if (orgStatus === "rejected")
    return (
      <View style={[common.card, styles.badCard]}>
        <Text style={common.title}>Verification was rejected</Text>
        {!!application?.rejectReason && <Text style={common.body}>Reason: {application.rejectReason}</Text>}
        <Button small title="Edit details and resubmit" onPress={() => navigation.navigate("ResubmitOrg")} style={{ alignSelf: "flex-start" }} />
      </View>
    );

  return (
    <View style={[common.card, styles.warnCard]}>
      <Text style={common.title}>Waiting for verification</Text>
      <Text style={common.body}>
        To prove you run this organization, send this code from your official Facebook/Instagram page or official email
        {VERIFICATION_CONTACT ? ` to ${VERIFICATION_CONTACT}` : ""}:
      </Text>
      <Text selectable style={styles.code}>
        {application?.verificationCode ?? "…"}
      </Text>
      <Text style={common.meta}>
        {application?.emailVerified ? "✓ Email confirmed" : "• Email not confirmed yet"}
        {"\n"}The VolunTeen team will review your request soon.
      </Text>
      <Button small variant="secondary" title="Edit submitted details" onPress={() => navigation.navigate("ResubmitOrg")} style={{ alignSelf: "flex-start" }} />
    </View>
  );
}

const styles = themed((colors) => StyleSheet.create({
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  warnCard: { backgroundColor: colors.warnBg, borderColor: colors.warnBorder },
  okCard: { backgroundColor: colors.okBg, borderColor: colors.okBorder },
  badCard: { backgroundColor: colors.badBg, borderColor: colors.badBorder },
  debug: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12, color: colors.text, lineHeight: 18 },
  code: { fontSize: 26, fontWeight: "800", letterSpacing: 2, color: colors.text, textAlign: "center", paddingVertical: 6 },
}));
