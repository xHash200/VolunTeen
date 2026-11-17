import { useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { sendMessage, useMessages } from "../../chat/api";
import { colors, common } from "../../theme";

const timeOf = (ts) => {
  const d = ts?.toDate?.();
  return d ? d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "";
};

export default function ChatRoomScreen({ route }) {
  const { chatId } = route.params;
  const { user, displayName } = useAuth();
  const messages = useMessages(chatId);
  const [text, setText] = useState("");
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const send = () => {
    const body = text;
    setText("");
    sendMessage(chatId, user.uid, displayName, body).catch((e) => {
      setText(body);
      console.warn("Send failed:", e.message);
    });
  };

  // Inverted list keeps the newest message at the bottom, next to the input.
  const data = [...messages].reverse();

  return (
    <KeyboardAvoidingView style={common.screen} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <FlatList
        inverted
        data={data}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12, gap: 6 }}
        ListEmptyComponent={<Text style={[common.empty, { transform: [{ scaleY: -1 }] }]}>Say hi 👋</Text>}
        renderItem={({ item: m, index }) => {
          const mine = m.senderId === user.uid;
          const showName = !mine && data[index + 1]?.senderId !== m.senderId;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              {showName && <Text style={styles.sender}>{m.senderName}</Text>}
              <Text style={[styles.text, mine && { color: "#fff" }]}>{m.text}</Text>
              <Text style={[styles.time, mine && { color: "#dbe6ff" }]}>{timeOf(m.createdAt)}</Text>
            </View>
          );
        }}
      />
      <View style={[styles.composer, { paddingBottom: 8 + insets.bottom }]}>
        <TextInput
          style={[common.input, { flex: 1, maxHeight: 120 }]}
          value={text}
          onChangeText={setText}
          placeholder="Message"
          placeholderTextColor={colors.muted}
          multiline
        />
        <Pressable onPress={send} disabled={!text.trim()} style={[styles.send, !text.trim() && { opacity: 0.4 }]}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: "80%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  sender: { fontSize: 12, fontWeight: "700", color: colors.accent, marginBottom: 2 },
  text: { fontSize: 15, color: colors.text },
  time: { fontSize: 10, color: colors.muted, alignSelf: "flex-end", marginTop: 2 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  send: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 11 },
});
