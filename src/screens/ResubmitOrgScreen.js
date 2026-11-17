import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { useAuth } from "../auth/AuthContext";
import OrgFields, { pickOrg, validateOrg } from "../components/OrgFields";
import { Button } from "../components/ui";
import { common } from "../theme";

export default function ResubmitOrgScreen({ navigation }) {
  const { application, orgStatus, resubmitApplication } = useAuth();
  const [org, setOrg] = useState(() => pickOrg(application ?? {}));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const problem = validateOrg(org);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      await resubmitApplication(org);
      Alert.alert("Sent", "Your details were sent for review.");
      navigation.goBack();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={common.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[common.list, { gap: 14 }]} keyboardShouldPersistTaps="handled">
        <OrgFields value={org} onChange={setOrg} />
        {!!error && <Text style={{ color: "#c0392b" }}>{error}</Text>}
        <Button title={orgStatus === "rejected" ? "Resubmit for review" : "Save details"} onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
