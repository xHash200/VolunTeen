import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui";
import { colors } from "../../theme";

// Replace assets/logo.png with the real logo (square PNG, ~1024×1024, transparent background works best).
const logo = require("../../../assets/logo.png");

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brand}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.name}>
          Volun<Text style={{ color: colors.accent }}>Teen</Text>
        </Text>
        <Text style={styles.tagline}>Volunteer at events organized by Timișoara's student leagues.</Text>
      </View>
      <View style={styles.actions}>
        <Button title="Sign in" onPress={() => navigation.navigate("SignIn")} />
        <Button title="Create account" variant="secondary" onPress={() => navigation.navigate("AccountType")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "space-between" },
  brand: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  logo: { width: 140, height: 140, borderRadius: 28 },
  name: { fontSize: 34, fontWeight: "800", color: colors.text },
  tagline: { fontSize: 16, color: colors.muted, textAlign: "center", maxWidth: 300 },
  actions: { gap: 12, paddingBottom: 8 },
});
