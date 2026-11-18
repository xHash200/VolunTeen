import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, common, setThemePreference, useTheme } from "../theme";

const THEMES = [
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
  { value: "system", label: "Same as phone", icon: "phone-portrait-outline" },
];

export default function SettingsScreen() {
  const { preference } = useTheme();

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list}>
      <Text style={common.sectionTitle}>Appearance</Text>
      <View style={[common.card, { padding: 0, gap: 0 }]}>
        {THEMES.map((t, i) => {
          const active = t.value === preference;
          return (
            <Pressable
              key={t.value}
              onPress={() => setThemePreference(t.value)}
              style={({ pressed }) => [
                common.row,
                { paddingHorizontal: 16, paddingVertical: 14 },
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name={t.icon} size={22} color={active ? colors.accent : colors.muted} />
              <Text style={[common.body, { flex: 1 }, active && { color: colors.accent, fontWeight: "600" }]}>{t.label}</Text>
              {active && <Ionicons name="checkmark" size={22} color={colors.accent} />}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
