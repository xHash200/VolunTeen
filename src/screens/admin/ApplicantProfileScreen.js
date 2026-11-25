import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { useData } from "../../data/DataContext";
import { Avatar, PhotoViewer } from "../../components/ui";
import { NameWithTag, useRoleTagOf } from "../../components/RoleTag";
import { colors, common } from "../../theme";
import { formatPlace } from "../../data/romania";

// Read-only public profile (users/{uid}). Opened from JobApplicants (with status + age from the
// application) and from Chat → Group info (just uid + name, registered there as "UserProfile").
export default function ApplicantProfileScreen({ route }) {
  // age comes from the application (the birth date itself is private).
  const { uid, name, status, age } = route.params;
  const { leagueById } = useData();
  const [profile, setProfile] = useState(undefined);
  const [viewingPhoto, setViewingPhoto] = useState(false);
  const tag = useRoleTagOf(uid, profile);

  useEffect(() => {
    if (!db || !uid) return setProfile(null);
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => setProfile(snap.exists() ? snap.data() : null),
      (err) => {
        console.warn("Profile load error:", err.message);
        setProfile(null);
      }
    );
  }, [uid]);

  const displayName = profile?.displayName || name || "Volunteer";
  const league = leagueById[profile?.leagueId]?.name;
  const row = (label, value) => (
    <View style={{ gap: 2 }}>
      <Text style={common.label}>{label}</Text>
      <Text style={common.body}>{value || "—"}</Text>
    </View>
  );

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list}>
      <View style={[common.card, { alignItems: "center", gap: 8 }]}>
        <Pressable onPress={() => setViewingPhoto(true)} disabled={!profile?.photo}>
          <Avatar name={displayName} size={88} photo={profile?.photo} />
        </Pressable>
        <PhotoViewer photo={profile?.photo} uid={uid} visible={viewingPhoto} onClose={() => setViewingPhoto(false)} />
        <NameWithTag kind={tag} name={displayName} textStyle={[common.title, { fontSize: 20 }]} />
        {!!status && <Text style={[common.tag, STATUS_STYLE[status]]}>{STATUS_LABEL[status] ?? status}</Text>}
      </View>
      {profile === undefined && <Text style={common.meta}>Loading profile…</Text>}
      {profile === null && <Text style={common.meta}>This person hasn't filled in a profile.</Text>}
      {!!profile && (
        <View style={[common.card, { gap: 4 }]}>
          {age != null && row("Age", `${age} (when they applied)`)}
          {row("City", formatPlace(profile))}
          {row("Faculty / school", profile.faculty)}
          {row("League", league)}
          {row("About", profile.bio)}
        </View>
      )}
    </ScrollView>
  );
}

const STATUS_LABEL = { pending: "On the waiting list", accepted: "Accepted", declined: "Declined" };
const STATUS_STYLE = {
  pending: { get backgroundColor() { return colors.warnBg; }, get color() { return colors.warnText; }, alignSelf: "center" },
  accepted: { backgroundColor: "#e5f6ec", color: "#1e8a4c", alignSelf: "center" },
  declined: { backgroundColor: "#fdecec", color: "#c0392b", alignSelf: "center" },
};
