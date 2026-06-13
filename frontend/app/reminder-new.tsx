import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../src/api";
import { requestNotificationPermission, scheduleLocalReminder } from "../src/notifications";
import { C, S } from "../src/theme";
import { WebDateTime } from "../src/WebDateTime";
import { notify } from "../src/confirm";

export default function ReminderEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing reminder if editing
  useEffect(() => {
    if (id) {
      (async () => {
        setLoading(true);
        try {
          const r = await api.get("/reminders");
          const found = r.data.find((x: any) => x.id === id);
          if (found) {
            setTitle(found.title || "");
            setDesc(found.description || "");
            try { setDate(new Date(found.remind_at)); } catch { /* ignore */ }
            setNotifyEmail(!!found.notify_email);
            setNotifyPush(!!found.notify_push);
          } else {
            notify("Not found", "This reminder no longer exists.");
            router.back();
          }
        } catch (err) {
          console.error("Load reminder failed:", err);
          notify("Failed", "Could not load reminder");
        } finally { setLoading(false); }
      })();
    }
  }, [id, router]);

  const save = async () => {
    if (!title.trim()) return notify("Required", "Enter a title");
    if (date <= new Date()) return notify("Invalid", "Pick a future date and time");
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: desc.trim(),
        remind_at: date.toISOString(),
        notify_email: notifyEmail,
        notify_push: notifyPush,
      };
      if (editing) {
        await api.put(`/reminders/${id}`, payload);
      } else {
        await api.post("/reminders", payload);
      }
      if (notifyPush && Platform.OS !== "web") {
        const ok = await requestNotificationPermission();
        if (ok) await scheduleLocalReminder(title, desc || "Reminder", date);
      }
      router.back();
    } catch (e: any) {
      notify("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.c} edges={["top"]}>
        <View style={styles.head}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
          <Text style={styles.title}>Edit reminder</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.brand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()} testID="rem-close"><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={styles.title}>{editing ? "Edit reminder" : "New reminder"}</Text>
        <View style={{ width: 26 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md }}>
          <Text style={styles.label}>TITLE</Text>
          <TextInput
            testID="rem-title"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Check tower 2 pump"
            placeholderTextColor={C.textMuted}
          />

          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            testID="rem-desc"
            style={[styles.input, { minHeight: 80 }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="More details..."
            placeholderTextColor={C.textMuted}
            multiline
          />

          <Text style={styles.label}>REMIND AT</Text>
          <WebDateTime
            value={date}
            onChange={setDate}
            minimum={new Date()}
            testID="rem-datetime"
          />
          <Text style={styles.helper}>{format(date, "EEEE, MMM d, yyyy · h:mm a")}</Text>

          <Text style={styles.label}>NOTIFY</Text>
          <Toggle label="Push notification" value={notifyPush} onChange={setNotifyPush} testID="t-push" />
          <Toggle label="Email" value={notifyEmail} onChange={setNotifyEmail} testID="t-email" />

          <TouchableOpacity style={styles.save} onPress={save} disabled={saving} testID="rem-save">
            <Text style={styles.saveText}>{saving ? "Saving..." : editing ? "Update reminder" : "Schedule reminder"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Toggle({ label, value, onChange, testID }: any) {
  return (
    <TouchableOpacity style={styles.tRow} onPress={() => onChange(!value)} testID={testID}>
      <Text style={styles.tLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleOn]}><View style={[styles.toggleDot, value && styles.toggleDotOn]} /></View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: "700", color: C.text },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.md, marginBottom: 6 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 15, color: C.text },
  helper: { fontSize: 12, color: C.text2, marginTop: 6, fontStyle: "italic" },
  tRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  tLabel: { fontSize: 15, color: C.text },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: C.bg3, padding: 2 },
  toggleOn: { backgroundColor: C.brand },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleDotOn: { transform: [{ translateX: 18 }] },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: S.lg },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
