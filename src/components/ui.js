import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, common } from "../theme";

export function Button({ title, onPress, variant = "primary", disabled, loading, small, style }) {
  const v = styles[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        v.box,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.text.color} /> : <Text style={[styles.text, v.text]}>{title}</Text>}
    </Pressable>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, value === o.value && styles.segmentActive]}>
          <Text style={[styles.segmentText, value === o.value && styles.segmentTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Avatar({ name = "?", size = 40 }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials || "?"}</Text>
    </View>
  );
}

export function SignInPrompt({ navigation, message = "Sign in to use this section." }) {
  return (
    <View style={[common.screen, styles.center]}>
      <Text style={[common.title, { textAlign: "center" }]}>{message}</Text>
      <Button title="Sign in or create account" onPress={() => navigation.navigate("Profile")} />
    </View>
  );
}

export function Field({ label, hint, multiline, style, ...props }) {
  return (
    <View style={{ gap: 4 }}>
      {!!label && <Text style={common.label}>{label}</Text>}
      <TextInput
        style={[common.input, multiline && { minHeight: 80, textAlignVertical: "top" }, style]}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        {...props}
      />
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export function Chips({ options, value, onChange }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable key={o.value || "none"} onPress={() => onChange(o.value)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && { color: "#fff" }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Checkbox({ checked, onChange, label }) {
  return (
    <Pressable onPress={() => onChange(!checked)} style={[common.row, { alignItems: "flex-start" }]}>
      <View style={[styles.box, checked && styles.boxChecked]}>{checked && <Text style={styles.tick}>✓</Text>}</View>
      <Text style={[common.body, { flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

const BADGES = {
  owner: { label: "Owner", bg: "#efe7ff", fg: "#6a3fd1" },
  tester: { label: "Tester", bg: "#e3f4f8", fg: "#137a92" },
  verified: { label: "✓ Verified organization", bg: "#e5f6ec", fg: "#1e8a4c" },
  pending: { label: "Pending verification", bg: colors.warnBg, fg: colors.warnText },
  rejected: { label: "Verification rejected", bg: "#fdecec", fg: "#c0392b" },
  personal: { label: "Personal account", bg: colors.accentSoft, fg: colors.accent },
};

export function Badge({ kind }) {
  const b = BADGES[kind];
  if (!b) return null;
  return <Text style={[common.tag, { backgroundColor: b.bg, color: b.fg, alignSelf: "center" }]}>{b.label}</Text>;
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, color: colors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  tick: { color: "#fff", fontWeight: "800", fontSize: 13 },
  base: { borderRadius: 8, paddingVertical: 11, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  small: { paddingVertical: 6, paddingHorizontal: 12 },
  text: { fontSize: 15, fontWeight: "600" },
  primary: { box: { backgroundColor: colors.accent }, text: { color: "#fff" } },
  secondary: { box: { backgroundColor: colors.border }, text: { color: colors.text } },
  danger: { box: { backgroundColor: "#fdecec" }, text: { color: "#c0392b" } },
  segmented: { flexDirection: "row", backgroundColor: colors.border, borderRadius: 10, padding: 3, margin: 16, marginBottom: 0 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { color: colors.muted, fontWeight: "600" },
  segmentTextActive: { color: colors.text },
  avatar: { backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.accent, fontWeight: "700" },
  center: { alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
});
