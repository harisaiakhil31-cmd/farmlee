import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { api } from "../src/api";
import { requestNotificationPermission, scheduleLocalReminder } from "../src/notifications";
import { C, S } from "../src/theme";

export default function NewReminder() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showD, setShowD] = useState(false);
  const [showT, setShowT] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return Alert.alert("Required", "Enter a title");
    if (date <= new Date()) return Alert.alert("Invalid", "Pick a future date/time");
    setSaving(true);
    try {
      await api.post("/reminders", {
        title: title.trim(), description: desc.trim(),
        remind_at: date.toISOString(),
        notify_email: notifyEmail, notify_push: notifyPush,
      });
      if (notifyPush) {
        const ok = await requestNotificationPermission();
        if (ok) await scheduleLocalReminder(title, desc || "Reminder", date);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={styles.title}>New reminder</Text>
        <View style={{ width: 26 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md }}>
          <Text style={styles.label}>TITLE</Text>
          <TextInput testID="rem-title" style={styles.input} value={title} onChangeText={setTitle}
            placeholder="e.g. Check tower 2 pump" placeholderTextColor={C.textMuted} />

          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput testID="rem-desc" style={[styles.input, { minHeight: 80 }]} value={desc} onChangeText={setDesc}
            placeholder="More details..." placeholderTextColor={C.textMuted} multiline />

          <Text style={styles.label}>REMIND AT</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowD(true)} testID="rem-date">
              <Ionicons name="calendar-outline" size={18} color={C.text} />
              <Text style={styles.dateText}>{format(date, "MMM d, yyyy")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowT(true)} testID="rem-time">
              <Ionicons name="time-outline" size={18} color={C.text} />
              <Text style={styles.dateText}>{format(date, "h:mm a")}</Text>
            </TouchableOpacity>
          </View>

          {showD && (
            <DateTimePicker
              value={date}
              mode="date"
              minimumDate={new Date()}
              onChange={(_, d) => { setShowD(false); if (d) setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), date.getHours(), date.getMinutes())); }}
            />
          )}
          {showT && (
            <DateTimePicker
              value={date}
              mode="time"
              onChange={(_, d) => { setShowT(false); if (d) setDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), d.getHours(), d.getMinutes())); }}
            />
          )}

          <Text style={styles.label}>NOTIFY</Text>
          <Toggle label="Push notification" value={notifyPush} onChange={setNotifyPush} testID="t-push" />
          <Toggle label="Email" value={notifyEmail} onChange={setNotifyEmail} testID="t-email" />

          <TouchableOpacity style={styles.save} onPress={save} disabled={saving} testID="rem-save">
            <Text style={styles.saveText}>{saving ? "Saving..." : "Schedule reminder"}</Text>
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
  row: { flexDirection: "row", gap: 8 },
  dateBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  dateText: { fontSize: 14, fontWeight: "600", color: C.text },
  tRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  tLabel: { fontSize: 15, color: C.text },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: C.bg3, padding: 2 },
  toggleOn: { backgroundColor: C.brand },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleDotOn: { transform: [{ translateX: 18 }] },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: S.lg },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
