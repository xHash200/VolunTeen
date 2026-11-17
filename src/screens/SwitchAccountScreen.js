import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { forgetAccount, listSavedAccounts } from "../auth/savedAccounts";
import { Avatar, Button } from "../components/ui";
import { colors, common } from "../theme";

const TYPE_LABEL = { personal: "Personal account", organization: "Organization" };

// Accounts remembered on this device. Tap to switch instantly; long-press to forget.
export default function SwitchAccountScreen({ navigation }) {
  const { user, switchAccount, signOut } = useAuth();
  const [accounts, setAccounts] = useState(null);
  const [busyUid, setBusyUid] = useState(null);

  const load = useCallback(() => {
    listSavedAccounts().then(setAccounts);
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

  const forget = (a) =>
    Alert.alert("Remove from this phone?", `${a.name || a.email} will no longer appear here. The account itself isn't deleted.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => forgetAccount(a.uid).then(load) },
    ]);

  const currentSaved = accounts?.some((a) => a.uid === user.uid);

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list}>
      {accounts === null && <Text style={common.meta}>Loading…</Text>}
      {accounts?.map((a) => {
        const current = a.uid === user.uid;
        return (
          <Pressable
            key={a.uid}
            onPress={() => pick(a)}
            onLongPress={() => !current && forget(a)}
            disabled={busyUid !== null}
            style={[common.card, common.row, current && { borderColor: colors.accent, borderWidth: 2 }, busyUid === a.uid && { opacity: 0.5 }]}
          >
            <Avatar name={a.name || a.email} />
            <View style={{ flex: 1 }}>
              <Text style={common.title}>{a.name || a.email}</Text>
              <Text style={common.meta}>{a.email}</Text>
              <Text style={[common.meta, { fontSize: 12 }]}>{TYPE_LABEL[a.type] ?? ""}</Text>
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
        Accounts are saved encrypted on this phone only. Long-press an account to remove it.
      </Text>
    </ScrollView>
  );
}
