import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { deleteContent, saveContent } from "../../admin/api";
import { CONTENT_TYPES, emptyFor } from "../../admin/contentSchemas";
import { useData } from "../../data/DataContext";
import { Button, Checkbox, Chips, Field } from "../../components/ui";
import { common } from "../../theme";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function ContentEditScreen({ route, navigation }) {
  const { type, id } = route.params;
  const schema = CONTENT_TYPES[type];
  const data = useData();
  const existing = id ? data[type].find((x) => String(x.id) === String(id)) : null;

  const [form, setForm] = useState(() => {
    const base = { ...emptyFor(type), ...(existing ?? {}) };
    // Lists are edited as one item per line.
    schema.fields.filter((f) => f.type === "list").forEach((f) => (base[f.key] = (base[f.key] ?? []).join("\n")));
    schema.fields.filter((f) => f.type === "number").forEach((f) => (base[f.key] = String(base[f.key] ?? "")));
    return base;
  });
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    for (const f of schema.fields) {
      const v = form[f.key];
      if (f.required && (v === "" || v == null)) return setError(`“${f.label}” is required.`);
      if (f.type === "date" && v && !DATE_RE.test(v)) return setError(`“${f.label}” must look like 2026-12-31.`);
    }

    const out = {};
    for (const f of schema.fields) {
      const v = form[f.key];
      if (f.type === "list") out[f.key] = v.split("\n").map((s) => s.trim()).filter(Boolean);
      else if (f.type === "number") out[f.key] = Number(v) || 0;
      else if (f.type === "bool") out[f.key] = Boolean(v);
      else out[f.key] = typeof v === "string" ? v.trim() : v;
    }
    if (type === "jobs") {
      // Keep the denormalized event name + league in sync with the chosen event.
      const ev = data.eventById[out.eventId];
      out.event = ev?.title ?? "";
      out.leagueId = ev?.leagueId ?? "";
    }

    setBusy("save");
    try {
      await saveContent(type, existing?.id, out);
      navigation.goBack();
    } catch (e) {
      setError(e.message);
      setBusy(null);
    }
  };

  const remove = () => {
    const linked =
      type === "events"
        ? data.jobs.filter((j) => j.eventId === existing.id).length
        : type === "leagues"
          ? data.events.filter((e) => e.leagueId === existing.id).length
          : 0;
    const warning = linked ? ` ${linked} ${type === "events" ? "job(s)" : "event(s)"} still point to it.` : "";
    Alert.alert(`Delete this ${schema.label.toLowerCase()}?`, `This can't be undone.${warning}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          try {
            await deleteContent(type, existing.id);
            navigation.goBack();
          } catch (e) {
            setError(e.message);
            setBusy(null);
          }
        },
      },
    ]);
  };

  const renderField = (f) => {
    switch (f.type) {
      case "league":
        return (
          <View key={f.key} style={{ gap: 6 }}>
            <Text style={common.label}>{f.label}</Text>
            <Chips options={data.leagues.map((l) => ({ value: l.id, label: l.name }))} value={form[f.key]} onChange={set(f.key)} />
          </View>
        );
      case "event":
        return (
          <View key={f.key} style={{ gap: 6 }}>
            <Text style={common.label}>{f.label}</Text>
            {data.events.length === 0 ? (
              <Text style={common.meta}>Create an event first.</Text>
            ) : (
              <Chips options={data.events.map((e) => ({ value: e.id, label: e.title }))} value={form[f.key]} onChange={set(f.key)} />
            )}
          </View>
        );
      case "bool":
        return <Checkbox key={f.key} checked={Boolean(form[f.key])} onChange={set(f.key)} label={f.label} />;
      default:
        return (
          <Field
            key={f.key}
            label={f.required ? `${f.label} *` : f.label}
            value={form[f.key]}
            onChangeText={set(f.key)}
            placeholder={f.placeholder ?? (f.type === "date" ? "YYYY-MM-DD" : undefined)}
            multiline={f.type === "multiline" || f.type === "list"}
            keyboardType={f.type === "number" ? "number-pad" : f.type === "date" ? "numbers-and-punctuation" : "default"}
            autoCapitalize={f.key === "website" ? "none" : "sentences"}
          />
        );
    }
  };

  return (
    <KeyboardAvoidingView style={common.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[common.list, { gap: 12 }]} keyboardShouldPersistTaps="handled">
        {schema.fields.map(renderField)}
        {!!error && <Text style={{ color: "#c0392b" }}>{error}</Text>}
        <Button title={existing ? "Save changes" : `Create ${schema.label.toLowerCase()}`} onPress={save} loading={busy === "save"} />
        {existing && <Button title={`Delete ${schema.label.toLowerCase()}`} variant="danger" onPress={remove} loading={busy === "delete"} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
