import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { authErrorMessage, useAuth } from "../../auth/AuthContext";
import { Button, Field } from "../../components/ui";
import { colors, common, themed } from "../../theme";

export default function SignInScreen({ navigation }) {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return setError("Enter your email above, then tap “Forgot password”.");
    try {
      await resetPassword(email);
      Alert.alert("Check your email", `We sent a password reset link to ${email.trim()}.`);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView style={common.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[common.list, { gap: 14 }]} keyboardShouldPersistTaps="handled">
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secureTextEntry autoComplete="password" onSubmitEditing={submit} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button title="Sign in" onPress={submit} loading={busy} />
        <Text style={styles.link} onPress={forgot}>
          Forgot password?
        </Text>
        <Text style={[common.meta, { textAlign: "center" }]}>
          No account yet?{" "}
          <Text style={styles.link} onPress={() => navigation.replace("AccountType")}>
            Create one
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = themed((colors) => StyleSheet.create({
  error: { color: "#c0392b", fontSize: 14 },
  link: { color: colors.accent, fontWeight: "600", textAlign: "center" },
}));
