import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import { DataProvider } from "./src/data/DataContext";
import WelcomeScreen from "./src/screens/auth/WelcomeScreen";
import SignInScreen from "./src/screens/auth/SignInScreen";
import AccountTypeScreen from "./src/screens/auth/AccountTypeScreen";
import SignUpPersonalScreen from "./src/screens/auth/SignUpPersonalScreen";
import SignUpOrganizationScreen from "./src/screens/auth/SignUpOrganizationScreen";
import JobsScreen from "./src/screens/JobsScreen";
import JobDetailScreen from "./src/screens/JobDetailScreen";
import EventsScreen from "./src/screens/EventsScreen";
import EventDetailScreen from "./src/screens/EventDetailScreen";
import LeaguesScreen from "./src/screens/LeaguesScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ResubmitOrgScreen from "./src/screens/ResubmitOrgScreen";
import ChatHomeScreen from "./src/screens/chat/ChatHomeScreen";
import ChatRoomScreen from "./src/screens/chat/ChatRoomScreen";
import ChatInfoScreen from "./src/screens/chat/ChatInfoScreen";
import NewGroupScreen from "./src/screens/chat/NewGroupScreen";
import AddFriendScreen from "./src/screens/chat/AddFriendScreen";
import AdminHomeScreen from "./src/screens/admin/AdminHomeScreen";
import OrgReviewScreen from "./src/screens/admin/OrgReviewScreen";
import AddTeamMemberScreen from "./src/screens/admin/AddTeamMemberScreen";
import ContentEditScreen from "./src/screens/admin/ContentEditScreen";
import ManageEventScreen from "./src/screens/admin/ManageEventScreen";
import SwitchAccountScreen from "./src/screens/SwitchAccountScreen";
import JobApplicantsScreen from "./src/screens/admin/JobApplicantsScreen";
import ApplicantProfileScreen from "./src/screens/admin/ApplicantProfileScreen";
import { CONTENT_TYPES } from "./src/admin/contentSchemas";
import { ROLES } from "./src/admin/api";
import { colors, common, ThemeProvider, useTheme } from "./src/theme";
import SettingsScreen from "./src/screens/SettingsScreen";
import DeleteAccountScreen from "./src/screens/DeleteAccountScreen";

// Navigation chrome (tab bar, headers, screen backgrounds) follows the current theme.
const navThemeFor = (mode) => {
  const base = mode === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: { ...base.colors, primary: colors.accent, background: colors.bg, card: colors.card, text: colors.text, border: colors.border },
  };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const headerStyle = () => ({ headerTintColor: colors.text, headerStyle: { backgroundColor: colors.card } });

const stack = (screens) =>
  function StackNavigator() {
    return (
      <Stack.Navigator screenOptions={headerStyle}>
        {screens.map(([name, component, options]) => (
          <Stack.Screen key={name} name={name} component={component} options={options} />
        ))}
      </Stack.Navigator>
    );
  };

const jobDetail = ["JobDetail", JobDetailScreen, { title: "Job details" }];

const AuthStack = stack([
  ["Welcome", WelcomeScreen, { headerShown: false }],
  ["SignIn", SignInScreen, { title: "Sign in" }],
  ["AccountType", AccountTypeScreen, { title: "Create account" }],
  ["SignUpPersonal", SignUpPersonalScreen, { title: "Personal account" }],
  ["SignUpOrganization", SignUpOrganizationScreen, { title: "Organization account" }],
]);

const JobsStack = stack([["Jobs", JobsScreen, { title: "VolunTeen" }], jobDetail]);
const contentEdit = [
  "ContentEdit",
  ContentEditScreen,
  ({ route }) => ({
    title: `${route.params?.id ? "Edit" : "New"} ${CONTENT_TYPES[route.params?.type]?.label.toLowerCase() ?? "item"}`,
  }),
];

const EventsStack = stack([["Events", EventsScreen], ["EventDetail", EventDetailScreen, { title: "Event" }], jobDetail]);
const LeaguesStack = stack([["LeaguesList", LeaguesScreen, { title: "Leagues" }]]);
const ChatStack = stack([
  ["ChatHome", ChatHomeScreen, { title: "Chat" }],
  ["ChatRoom", ChatRoomScreen, ({ route }) => ({ title: route.params?.title ?? "Chat", headerTitleAlign: "center" })],
  ["ChatInfo", ChatInfoScreen, { title: "Group info", headerTitleAlign: "center" }],
  ["NewGroup", NewGroupScreen, { title: "New group" }],
  ["AddFriend", AddFriendScreen, { title: "Add friend" }],
]);
const ProfileStack = stack([
  [
    "ProfileHome",
    ProfileScreen,
    ({ navigation }) => ({
      title: "Profile",
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate("Settings")} hitSlop={10} accessibilityLabel="Settings">
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </Pressable>
      ),
    }),
  ],
  ["ResubmitOrg", ResubmitOrgScreen, { title: "Organization details" }],
  ["SwitchAccount", SwitchAccountScreen, { title: "Switch account" }],
  ["Settings", SettingsScreen, { title: "Settings" }],
  ["DeleteAccount", DeleteAccountScreen, { title: "Delete account" }],
]);
const AdminStack = stack([
  ["AdminHome", AdminHomeScreen, { title: "Admin" }],
  ["OrgReview", OrgReviewScreen, ({ route }) => ({ title: route.params?.title ?? "Review" })],
  ["ManageEvent", ManageEventScreen, ({ route }) => ({ title: route.params?.title ?? "Event" })],
  ["JobApplicants", JobApplicantsScreen, { title: "Applicants" }],
  ["ApplicantProfile", ApplicantProfileScreen, ({ route }) => ({ title: route.params?.name ?? "Profile" })],
  ["AddTeamMember", AddTeamMemberScreen, ({ route }) => ({ title: `Add ${ROLES[route.params?.role]?.label.toLowerCase() ?? "member"}` })],
  contentEdit,
]);

const icons = {
  JobsTab: "briefcase",
  EventsTab: "calendar",
  Leagues: "people",
  ChatTab: "chatbubbles",
  Profile: "person-circle",
  Admin: "shield-checkmark",
};

function MainTabs() {
  const { canManageEvents, helperEventIds, adminTabTitle } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? icons[route.name] : `${icons[route.name]}-outline`} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="JobsTab" component={JobsStack} options={{ title: "Jobs" }} />
      <Tab.Screen name="EventsTab" component={EventsStack} options={{ title: "Events" }} />
      <Tab.Screen name="Leagues" component={LeaguesStack} />
      <Tab.Screen name="ChatTab" component={ChatStack} options={{ title: "Chat" }} />
      <Tab.Screen name="Profile" component={ProfileStack} />
      {(canManageEvents || helperEventIds.length > 0) && (
        <Tab.Screen name="Admin" component={AdminStack} options={{ title: adminTabTitle }} />
      )}
    </Tab.Navigator>
  );
}

function Splash() {
  return (
    <View style={[common.screen, { alignItems: "center", justifyContent: "center", gap: 20 }]}>
      <Image source={require("./assets/logo.png")} style={{ width: 120, height: 120, borderRadius: 24 }} resizeMode="contain" />
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

// Remembers where you are, so the screens can be rebuilt with new colors when the theme changes
// (keyed remount below) without losing your place.
let savedNavState;

function Root() {
  const { user, initializing, available } = useAuth();
  const { mode } = useTheme();
  if (!available)
    return <Text style={[common.empty, { marginTop: 80 }]}>Firebase isn't configured. Add your keys to .env.local.</Text>;
  if (initializing) return <Splash />;
  return (
    <NavigationContainer
      key={mode}
      theme={navThemeFor(mode)}
      initialState={savedNavState?.signedIn === Boolean(user) ? savedNavState.state : undefined}
      onStateChange={(state) => (savedNavState = { state, signedIn: Boolean(user) })}
    >
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <DataProvider>
            <Root />
            <ThemedStatusBar />
          </DataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
