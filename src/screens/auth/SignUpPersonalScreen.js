import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { authErrorMessage, useAuth } from "../../auth/AuthContext";
import { Button, Field, PlaceFields } from "../../components/ui";
import { citiesOf, countiesOf, COUNTRIES } from "../../data/romania";
import { ageFrom, common, euToIso, maskEuDate } from "../../theme";
import { MIN_AGE } from "../../config";

export default function SignUpPersonalScreen() {
  const { signUpPersonal } = useAuth();
  const [form, setForm] = useState({ name: "", birth: "", place: { country: "Romania", county: "", city: "" }, email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const birthDate = euToIso(form.birth);
  const age = birthDate ? ageFrom(birthDate) : null;

  const submit = async () => {
    setError("");
    if (!form.name.trim()) return setError("Please enter your name.");
    if (!birthDate) return setError("Please enter a real date of birth, like 31.12.2008.");
    if (age > 120) return setError("Please check your date of birth.");
    if (age < MIN_AGE) return setError(`You need to be at least ${MIN_AGE} to use VolunTeen.`);
    if (!form.place.county || !form.place.city) return setError("Please select your county and city.");
    if (form.password !== form.confirm) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await signUpPersonal(form.email, form.password, form.name, { birthDate, ...form.place });
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={common.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[common.list, { gap: 14 }]} keyboardShouldPersistTaps="handled">
        <Field label="Full name" value={form.name} onChangeText={set("name")} placeholder="Your name" autoComplete="name" />
        <Field
          label="Date of birth"
          value={form.birth}
          onChangeText={(v) => set("birth")(maskEuDate(v))}
          placeholder="DD.MM.YYYY"
          keyboardType="number-pad"
          maxLength={10}
          hint={
            age != null && age >= 0
              ? `You're ${age}. This can't be changed later.`
              : `You must be at least ${MIN_AGE}. This can't be changed later.`
          }
        />
        <PlaceFields value={form.place} onChange={set("place")} countries={COUNTRIES} countiesOf={countiesOf} citiesOf={citiesOf} />
        <Field label="Email" value={form.email} onChangeText={set("email")} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={form.password} onChangeText={set("password")} placeholder="At least 6 characters" secureTextEntry autoComplete="new-password" />
        <Field label="Confirm password" value={form.confirm} onChangeText={set("confirm")} placeholder="Repeat password" secureTextEntry />
        {!!error && <Text style={{ color: "#c0392b" }}>{error}</Text>}
        <Button title="Create account" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
