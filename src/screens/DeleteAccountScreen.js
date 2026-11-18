import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useData } from "../data/DataContext";
import { deleteMyAccount } from "../auth/deleteAccount";
import { Button, Field } from "../components/ui";
import { colors, common } from "../theme";

export default function DeleteAccountScreen({ navigation }) {
  const { user, isOwner, isTester, accountType } = useAuth();
  const { jobs } = useData();
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isOwner || isTester) {
    return (
      <View style={[common.screen, common.list]}>
        <Text style={common.body}>
          {isOwner ? "Owner" : "Tester"} accounts can't be deleted from the app. Ask another owner to remove your role in
          Admin → Team first, then delete the account here.
        </Text>
      </View>
    );
  }

  const confirm = async () => {
    setError("");
    if (!password) return setError("Enter your password to confirm.");
    setBusy(true);
    try {
      await deleteMyAccount({ password, jobs, onStep: setStep });
      // Signed out automatically; the app returns to the welcome screen.
    } catch (e) {
      setBusy(false);
      setStep("");
      setError(
        ["auth/wrong-password", "auth/invalid-credential"].includes(e.code)
          ? "That password isn't right."
          : `Couldn't finish deleting (${e.message}). Some data may already be gone — try again to remove the rest.`
      );
    }
  };

  return (
    <KeyboardAvoidingView style={common.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[common.list, { gap: 14 }]} keyboardShouldPersistTaps="handled">
        <View style={[common.card, { backgroundColor: colors.badBg, borderColor: colors.badBorder }]}>
          <Text style={common.title}>This can't be undone</Text>
          <Text style={common.body}>
            Deleting {user.email} removes your profile, photo, birth date, applications, friends and chat memberships.
          </Text>
          <Text style={common.meta}>
            Messages you already sent stay in other people's chats.
            {accountType === "organization" ? " Your events stay published until staff remove them." : ""}
          </Text>
        </View>
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" editable={!busy} />
        {!!step && <Text style={common.meta}>{step}</Text>}
        {!!error && <Text style={{ color: "#c0392b" }}>{error}</Text>}
        <Button title="Delete my account" variant="danger" onPress={confirm} loading={busy} />
        <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
