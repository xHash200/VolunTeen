import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, common, themed } from "../../theme";

const TYPES = [
  {
    screen: "SignUpPersonal",
    icon: "person",
    title: "Personal account",
    text: "For students and volunteers. Find volunteer jobs and events, add friends and chat.",
  },
  {
    screen: "SignUpOrganization",
    icon: "business",
    title: "Organization account",
    text: "For student leagues and organizations that run events. Needs to be verified by the VolunTeen team before it's active.",
  },
];

export default function AccountTypeScreen({ navigation }) {
  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list}>
      <Text style={[common.title, { fontSize: 20 }]}>What kind of account do you need?</Text>
      {TYPES.map((t) => (
        <Pressable key={t.screen} style={[common.card, styles.option]} onPress={() => navigation.navigate(t.screen)}>
          <View style={styles.icon}>
            <Ionicons name={t.icon} size={26} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={common.title}>{t.title}</Text>
            <Text style={common.meta}>{t.text}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = themed((colors) => StyleSheet.create({
  option: { flexDirection: "row", alignItems: "center", gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
}));
