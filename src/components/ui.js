import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, common, themed } from "../theme";
import { loadFullPhoto } from "../profile/photo";

// A field you tap to choose one value from a list (opens a full-screen, searchable list).
export function SelectField({ label, value, options, onChange, placeholder = "Select…", disabled, hint }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const shown = q ? options.filter((o) => norm(o).includes(norm(q))) : options;

  return (
    <View style={{ gap: 4 }}>
      {!!label && <Text style={common.label}>{label}</Text>}
      <Pressable
        onPress={() => !disabled && (setQ(""), setOpen(true))}
        style={[common.input, common.row, { justifyContent: "space-between" }, disabled && { opacity: 0.5 }]}
      >
        <Text style={{ fontSize: 15, color: value ? colors.text : colors.muted }}>{value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={common.screen}>
          <View style={[common.row, { padding: 16, paddingBottom: 8 }]}>
            <Text style={[common.title, { flex: 1 }]}>{label || placeholder}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </View>
          {options.length > 8 && (
            <TextInput
              style={[common.input, { marginHorizontal: 16, marginBottom: 8 }]}
              placeholder="Search"
              placeholderTextColor={colors.muted}
              value={q}
              onChangeText={setQ}
              autoCorrect={false}
            />
          )}
          <FlatList
            data={shown}
            keyExtractor={(o) => o}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={common.empty}>No matches.</Text>}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  common.row,
                  { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
                  pressed && { backgroundColor: colors.accentSoft },
                ]}
              >
                <Text style={[common.body, { flex: 1 }, item === value && { color: colors.accent, fontWeight: "600" }]}>{item}</Text>
                {item === value && <Ionicons name="checkmark" size={20} color={colors.accent} />}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Full-screen view of a profile photo. Shows the normal photo instantly, then swaps in the
// high-resolution version (if the person has one) once it's downloaded. Tap anywhere to close.
export function PhotoViewer({ photo, uid, visible, onClose }) {
  const [full, setFull] = useState(null);
  useEffect(() => {
    setFull(null);
    if (!visible || !uid) return;
    let alive = true;
    loadFullPhoto(uid).then((d) => alive && setFull(d));
    return () => {
      alive = false;
    };
  }, [visible, uid, photo]);

  return (
    <Modal visible={visible && !!photo} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" }}>
        <Image source={{ uri: full || photo }} style={{ width: "92%", aspectRatio: 1, borderRadius: 16 }} resizeMode="contain" />
        <Text style={{ color: "#bbb", marginTop: 16 }}>Tap to close</Text>
      </Pressable>
    </Modal>
  );
}

// Country → county → city. `value` = { country, county, city }; changing a level clears the ones below it.
export function PlaceFields({ value, onChange, countries, countiesOf, citiesOf }) {
  const v = value ?? {};
  return (
    <View style={{ gap: 10 }}>
      <SelectField label="Country" value={v.country} options={countries} onChange={(country) => onChange({ country, county: "", city: "" })} />
      <SelectField
        label="County"
        value={v.county}
        options={countiesOf(v.country)}
        disabled={!v.country}
        placeholder={v.country ? "Select county…" : "Select country first"}
        onChange={(county) => {
          const cities = citiesOf(v.country, county);
          onChange({ ...v, county, city: cities.length === 1 ? cities[0] : "" });
        }}
      />
      <SelectField
        label="City"
        value={v.city}
        options={citiesOf(v.country, v.county)}
        disabled={!v.county}
        placeholder={v.county ? "Select city…" : "Select county first"}
        onChange={(city) => onChange({ ...v, city })}
      />
    </View>
  );
}

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

// `photo`: optional data/https URI (users/{uid}.photo). Falls back to initials.
export function Avatar({ name = "?", size = 40, photo }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft }} />;
  }
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
  owner: { label: "Owner", bg: "#d62828", fg: "#ffffff" },
  tester: { label: "Tester", bg: "#ffd60a", fg: "#3d3200" },
  organizer: { label: "Organizer", bg: "#7b2cbf", fg: "#ffffff" },
  organization: { label: "Organization", bg: "#7b2cbf", fg: "#ffffff" },
  verified: { label: "✓ Verified organization", bg: "#e5f6ec", fg: "#1e8a4c" },
  pending: { label: "Pending verification", get bg() { return colors.warnBg; }, get fg() { return colors.warnText; } },
  rejected: { label: "Verification rejected", bg: "#fdecec", fg: "#c0392b" },
  personal: { label: "Personal account", bg: "#4cc9f0", fg: "#06304a" },
};

export function Badge({ kind }) {
  const b = BADGES[kind];
  if (!b) return null;
  return <Text style={[common.tag, { backgroundColor: b.bg, color: b.fg, alignSelf: "center" }]}>{b.label}</Text>;
}

const styles = themed((colors) => StyleSheet.create({
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
}));
