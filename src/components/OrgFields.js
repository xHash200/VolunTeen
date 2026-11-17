import { Text, View } from "react-native";
import { ORG_TYPES } from "../config";
import { useData } from "../data/DataContext";
import { common } from "../theme";
import { Chips, Field } from "./ui";

export const emptyOrg = {
  orgName: "",
  orgType: ORG_TYPES[0],
  university: "",
  faculty: "",
  leagueId: "",
  website: "",
  socialUrl: "",
  contactName: "",
  contactRole: "",
  phone: "",
  notes: "",
};

export const pickOrg = (src = {}) => Object.fromEntries(Object.keys(emptyOrg).map((k) => [k, src[k] ?? emptyOrg[k]]));

export function validateOrg(org) {
  if (!org.orgName.trim()) return "Please enter the organization's name.";
  if (!org.university.trim()) return "Please enter the university.";
  if (!org.website.trim() && !org.socialUrl.trim()) return "Add a website or an official social media page so we can verify you.";
  if (!org.contactName.trim() || !org.contactRole.trim()) return "Please enter the contact person and their role.";
  if (org.phone.replace(/\D/g, "").length < 9) return "Please enter a valid phone number.";
  return null;
}

// Organization details form, used on sign-up and when resubmitting after a rejection.
export default function OrgFields({ value, onChange }) {
  const { leagues } = useData();
  const set = (key) => (v) => onChange({ ...value, [key]: v });

  return (
    <View style={{ gap: 10 }}>
      <Text style={common.sectionTitle}>Organization</Text>
      <Field label="Official name *" value={value.orgName} onChangeText={set("orgName")} placeholder="e.g. LSAC Timișoara" />
      <Text style={common.label}>Type</Text>
      <Chips options={ORG_TYPES.map((t) => ({ value: t, label: t }))} value={value.orgType} onChange={set("orgType")} />
      <Field label="University *" value={value.university} onChangeText={set("university")} placeholder="e.g. Universitatea Politehnica Timișoara" />
      <Field label="Faculty" value={value.faculty} onChangeText={set("faculty")} placeholder="e.g. Automatică și Calculatoare" />
      {leagues.length > 0 && (
        <>
          <Text style={common.label}>Are you one of these leagues?</Text>
          <Chips
            options={[{ value: "", label: "No / not listed" }, ...leagues.map((l) => ({ value: l.id, label: l.name }))]}
            value={value.leagueId}
            onChange={set("leagueId")}
          />
        </>
      )}

      <Text style={common.sectionTitle}>Official presence</Text>
      <Field label="Website" value={value.website} onChangeText={set("website")} placeholder="https://…" autoCapitalize="none" keyboardType="url" />
      <Field
        label="Facebook / Instagram page"
        value={value.socialUrl}
        onChangeText={set("socialUrl")}
        placeholder="https://instagram.com/…"
        autoCapitalize="none"
        keyboardType="url"
        hint="We'll ask you to send a code from this page to prove it's yours."
      />

      <Text style={common.sectionTitle}>Contact person</Text>
      <Field label="Full name *" value={value.contactName} onChangeText={set("contactName")} placeholder="Who should we talk to?" />
      <Field label="Role in the organization *" value={value.contactRole} onChangeText={set("contactRole")} placeholder="e.g. President, HR coordinator" />
      <Field label="Phone *" value={value.phone} onChangeText={set("phone")} placeholder="07xx xxx xxx" keyboardType="phone-pad" />
      <Field label="Anything else we should know?" value={value.notes} onChangeText={set("notes")} multiline placeholder="Optional" />
    </View>
  );
}
