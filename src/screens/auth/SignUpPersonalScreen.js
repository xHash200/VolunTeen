import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { authErrorMessage, useAuth } from "../../auth/AuthContext";
import { Button, Field } from "../../components/ui";
import { common } from "../../theme";

export default function SignUpPersonalScreen() {
  const { signUpPersonal } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.name.trim()) return setError("Please enter your name.");
    if (form.password !== form.confirm) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await signUpPersonal(form.email, form.password, form.name);
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={common.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[common.list, { gap: 14 }]} keyboardShouldPersistTaps="handled">
        <Field label="Full name" value={form.name} onChangeText={set("name")} placeholder="Your name" autoComplete="name" />
        <Field label="Email" value={form.email} onChangeText={set("email")} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={form.password} onChangeText={set("password")} placeholder="At least 6 characters" secureTextEntry autoComplete="new-password" />
        <Field label="Confirm password" value={form.confirm} onChangeText={set("confirm")} placeholder="Repeat password" secureTextEntry />
        {!!error && <Text style={{ color: "#c0392b" }}>{error}</Text>}
        <Button title="Create account" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
