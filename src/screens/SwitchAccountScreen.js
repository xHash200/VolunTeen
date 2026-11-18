import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthContext";
import { forgetAccount, listSavedAccounts, updateSavedAccountInfo } from "../auth/savedAccounts";
import { Avatar, Button, Field } from "../components/ui";
import { colors, common } from "../theme";

const ROLE_LABEL = { owner: "Owner account", tester: "Tester account", organization: "Organization" };
const TYPE_LABEL = { personal: "Personal account", organization: "Organization (not verified yet)" };
const label = (a) => ROLE_LABEL[a.role] ?? TYPE_LABEL[a.type] ?? "";
// Most permissions first: owner → tester → organization → personal.
const rank = (a) => (a.role === "owner" ? 0 : a.role === "tester" ? 1 : a.type === "organization" ? 2 : 3);
// Nickname is a label stored only on this phone; it doesn't change the account's profile name.
const shownName = (a) => a.nickname || a.name || a.email;

async function liveInfo(a) {
  const [profile, owner, tester] = await Promise.all([
    getDoc(doc(db, "users", a.uid)),
    getDoc(doc(db, "owners", a.uid)),
    getDoc(doc(db, "testers", a.uid)),
  ]);
  const p = profile.exists() ? profile.data() : {};
  const type = p.accountType ?? a.type ?? "personal";
  const role = owner.exists() ? "owner" : tester.exists() ? "tester" : type === "organization" && p.orgStatus === "verified" ? "organization" : null;
  return { ...a, name: p.displayName || a.name, type, role };
}

// Accounts remembered on this device. Tap to switch instantly; long-press to rename or forget.
export default function SwitchAccountScreen({ navigation }) {
  const { user, switchAccount, signOut } = useAuth();
  const [accounts, setAccounts] = useState(null);
  const [busyUid, setBusyUid] = useState(null);
  const [renaming, setRenaming] = useState(null); // { uid, text }

  const load = useCallback(() => {
    (async () => {
      const saved = await listSavedAccounts();
      // Show what's saved right away, then replace with each account's live status from Firebase
      // (profile type, verification, owner/tester role) so labels never go stale.
      setAccounts([...saved].sort((a, b) => rank(a) - rank(b)));
      const live = await Promise.all(saved.map((a) => liveInfo(a).catch(() => a)));
      // Array.sort is stable, so accounts with the same rank keep the order they were saved in.
      setAccounts(live.sort((a, b) => rank(a) - rank(b)));
      live.forEach((a) => updateSavedAccountInfo(a.uid, { name: a.name, type: a.type, role: a.role ?? null }));
    })();
  }, []);
  useFocusEffect(load);

  const pick = async (a) => {
    if (a.uid === user.uid) return;
    setBusyUid(a.uid);
    try {
      await switchAccount(a.uid);
      navigation.popToTop();
    } catch (e) {
      Alert.alert("Couldn't switch", e.message);
      load();
    } finally {
      setBusyUid(null);
    }
  };

  const options = (a) =>
    Alert.alert(shownName(a), undefined, [
      { text: "Rename on this phone", onPress: () => setRenaming({ uid: a.uid, text: shownName(a) }) },
      ...(a.uid === user.uid
        ? []
        : [{ text: "Remove from this phone", style: "destructive", onPress: () => forgetAccount(a.uid).then(load) }]),
      { text: "Cancel", style: "cancel" },
    ]);

  const saveName = async () => {
    await updateSavedAccountInfo(renaming.uid, { nickname: renaming.text.trim() });
    setRenaming(null);
    load();
  };

  const currentSaved = accounts?.some((a) => a.uid === user.uid);

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list} keyboardShouldPersistTaps="handled">
      {accounts === null && <Text style={common.meta}>Loading…</Text>}
      {accounts?.map((a) => {
        const current = a.uid === user.uid;
        if (renaming?.uid === a.uid) {
          return (
            <View key={a.uid} style={[common.card, { gap: 8 }]}>
              <Field
                label="Name shown here"
                value={renaming.text}
                onChangeText={(text) => setRenaming((r) => ({ ...r, text }))}
                hint="Only changes how this account appears in this list. Leave empty to use the profile name."
                autoFocus
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button small title="Save" onPress={saveName} />
                <Button small variant="secondary" title="Cancel" onPress={() => setRenaming(null)} />
              </View>
            </View>
          );
        }
        return (
          <Pressable
            key={a.uid}
            onPress={() => pick(a)}
            onLongPress={() => options(a)}
            disabled={busyUid !== null}
            style={[common.card, common.row, current && { borderColor: colors.accent, borderWidth: 2 }, busyUid === a.uid && { opacity: 0.5 }]}
          >
            <Avatar name={shownName(a)} />
            <View style={{ flex: 1 }}>
              <Text style={common.title}>{shownName(a)}</Text>
              <Text style={common.meta}>{a.email}</Text>
              <Text style={[common.meta, { fontSize: 12 }, a.role === "owner" && { color: "#d62828", fontWeight: "700" }]}>{label(a)}</Text>
            </View>
            {current ? (
              <Text style={{ color: colors.accent, fontWeight: "700" }}>✓ Current</Text>
            ) : (
              busyUid === a.uid && <Text style={common.meta}>Switching…</Text>
            )}
          </Pressable>
        );
      })}
      {accounts && !currentSaved && (
        <Text style={common.meta}>
          The account you're using now isn't saved yet. Sign out and sign in to it once, and it will appear here.
        </Text>
      )}
      <Button title="+ Add another account" variant="secondary" onPress={signOut} />
      <Text style={[common.meta, { fontSize: 12 }]}>
        Accounts are saved encrypted on this phone only. Long-press an account to rename or remove it.
      </Text>
    </ScrollView>
  );
}
