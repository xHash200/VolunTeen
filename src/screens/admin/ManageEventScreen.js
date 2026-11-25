import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { addGroupMembers, ensureEventChat, eventChatId } from "../../chat/api";
import { useAuth } from "../../auth/AuthContext";
import { organizerOf, sortRoles } from "../../admin/contentSchemas";
import { useData } from "../../data/DataContext";
import { ORGANIZER_CATEGORY } from "../../config";
import { Button } from "../../components/ui";
import { colors, common, formatDate } from "../../theme";

// One event in the Admin / My events tab. The organization (and staff) edit it and its roles;
// event helpers (accepted "Organizer"s) only open roles to review applicants.
export default function ManageEventScreen({ route, navigation }) {
  const { eventById, jobs, leagueById } = useData();
  const { user, displayName, canEditEvent, canReviewEvent } = useAuth();
  const event = eventById[route.params.eventId];

  if (!event) return <Text style={common.empty}>This event no longer exists.</Text>;
  if (!canReviewEvent(event)) return <Text style={common.empty}>You can only manage events you created or help organize.</Text>;
  const canEdit = canEditEvent(event);

  const roles = sortRoles(jobs.filter((j) => j.eventId === event.id));
  const totalSpots = roles.reduce((sum, j) => sum + (Number(j.spots) || 0), 0);

  return (
    <ScrollView style={common.screen} contentContainerStyle={common.list}>
      <View style={[common.card, { gap: 6 }]}>
        {!!event.category && <Text style={common.tag}>{event.category}</Text>}
        <Text style={[common.title, { fontSize: 20 }]}>{event.title}</Text>
        <Text style={common.meta}>
          {formatDate(event.date)}
          {event.time ? ` · ${event.time}` : ""}
          {event.location ? ` · ${event.location}` : ""}
        </Text>
        {!!organizerOf(event, leagueById) && <Text style={common.meta}>Organized by {organizerOf(event, leagueById)}</Text>}
        {canEdit ? (
          <Button
            small
            variant="secondary"
            title="Edit event details"
            onPress={() => navigation.navigate("ContentEdit", { type: "events", id: event.id })}
            style={{ alignSelf: "flex-start", marginTop: 6 }}
          />
        ) : (
          <Text style={[common.meta, { color: colors.accent }]}>
            You're an Organizer for this event: you can accept or decline volunteers.
          </Text>
        )}
      </View>

      {/* The event's group chat (organization + everyone accepted). Created here if nobody's been accepted yet. */}
      <Button
        variant="secondary"
        title="💬 Event chat"
        onPress={() =>
          ensureEventChat(event)
            // Staff/helpers who aren't in it yet join, so they can read and write.
            .then(async (chat) => {
              if (!chat.members?.includes(user.uid)) await addGroupMembers(eventChatId(event.id), [{ id: user.uid, name: displayName }]);
              return chat;
            })
            .then((chat) =>
              navigation.navigate("ChatTab", {
                screen: "ChatRoom",
                params: { chatId: eventChatId(event.id), title: chat.name },
                initial: false,
              })
            )
            .catch((e) => Alert.alert("Couldn't open the event chat", e.message))
        }
      />

      <Text style={common.sectionTitle}>
        Volunteer roles ({roles.length}) · {totalSpots} spots
      </Text>
      {canEdit && (
        <Button
          title="+ Add volunteer role"
          onPress={() =>
            navigation.navigate("ContentEdit", {
              type: "jobs",
              preset: { eventId: event.id, date: event.date, location: event.location, hours: event.time },
            })
          }
        />
      )}
      {roles.length === 0 && <Text style={common.meta}>No roles yet. Add the volunteers you need for this event.</Text>}
      {roles.map((j) => {
        const isOrgRole = j.category === ORGANIZER_CATEGORY;
        const locked = isOrgRole && !canEdit; // helpers can't pick other Organizers
        return (
          <Pressable
            key={j.id}
            disabled={locked}
            style={[common.card, isOrgRole && { borderColor: "#7b2cbf", borderWidth: 2 }]}
            onPress={() => navigation.navigate("JobApplicants", { jobId: j.id })}
          >
            {isOrgRole && <Text style={[common.tag, { backgroundColor: "#7b2cbf", color: "#fff" }]}>★ Organizer</Text>}
            <Text style={common.title}>{j.title}</Text>
            <Text style={common.meta}>
              {[j.hours, `${Number(j.acceptedCount) || 0}/${j.spots ?? 0} spots filled`, !isOrgRole && j.category]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {!locked && (
              <Text style={{ color: colors.accent, fontSize: 13 }}>
                {canEdit ? "Tap to see applicants & edit" : "Tap to see applicants"}
              </Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
