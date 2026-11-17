import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DataProvider } from "./src/data/DataContext";
import JobsScreen from "./src/screens/JobsScreen";
import JobDetailScreen from "./src/screens/JobDetailScreen";
import LeaguesScreen from "./src/screens/LeaguesScreen";
import { colors } from "./src/theme";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const headerStyle = { headerTintColor: colors.text, headerStyle: { backgroundColor: colors.card } };

function JobsStack() {
  return (
    <Stack.Navigator screenOptions={headerStyle}>
      <Stack.Screen name="Jobs" component={JobsScreen} options={{ title: "VolunTeen" }} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job details" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.accent, ...headerStyle }}>
            <Tab.Screen name="JobsTab" component={JobsStack} options={{ title: "Jobs", headerShown: false }} />
            <Tab.Screen name="Leagues" component={LeaguesScreen} />
          </Tab.Navigator>
        </NavigationContainer>
        <StatusBar style="dark" />
      </DataProvider>
    </SafeAreaProvider>
  );
}
