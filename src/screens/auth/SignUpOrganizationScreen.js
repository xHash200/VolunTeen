import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { authErrorMessage, useAuth } from "../../auth/AuthContext";
import OrgFields, { emptyOrg, validateOrg } from "../../components/OrgFields";
import { Button, Checkbox, Field } from "../../components/ui";
import { common } from "../../theme";

export default function SignUpOrganizationScreen() {
  const { signUpOrganization } = useAuth();
  const [account, setAccount] = useState({ email: "", password: "", confirm: "" });
  const [org, setOrg] = useState(emptyOrg);
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (v) => setAccount((a) => ({ ...a, [k]: v }));

  const submit = async () => {
    setError("");
    if (account.password !== account.confirm) return setError("Passwords don't match.");
    const orgError = validateOrg(org);
    if (orgError) return setError(orgError);
    if (!authorized) return setError("Please confirm you're authorized to represent this organization.");
    setBusy(true);
    try {
      await signUpOrganization(account.email, account.password, org);
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={common.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[common.list, { gap: 14 }]} keyboardShouldPersistTaps="handled">
        <View style={[common.card, { gap: 4 }]}>
          <Text style={common.title}>How verification works</Text>
          <Text style={common.meta}>
            1. Fill in your organization's details.{"\n"}2. Confirm your email.{"\n"}3. Send the code we give you from your official
            page or email.{"\n"}4. The VolunTeen team reviews and approves your account.
          </Text>
        </View>

        <Text style={common.sectionTitle}>Account</Text>
        <Field
          label="Email"
          value={account.email}
          onChangeText={set("email")}
          placeholder="Official email, if you have one"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field label="Password" value={account.password} onChangeText={set("password")} placeholder="At least 6 characters" secureTextEntry autoComplete="new-password" />
        <Field label="Confirm password" value={account.confirm} onChangeText={set("confirm")} placeholder="Repeat password" secureTextEntry />

        <OrgFields value={org} onChange={setOrg} />

        <Checkbox checked={authorized} onChange={setAuthorized} label="I confirm I'm authorized to represent this organization." />
        {!!error && <Text style={{ color: "#c0392b" }}>{error}</Text>}
        <Button title="Create organization account" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
