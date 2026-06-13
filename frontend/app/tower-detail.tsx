import { useEffect, useState } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../src/api";
import { C, S } from "../src/theme";
import { notify } from "../src/confirm";

const STATUSES = [
  { v: "healthy", label: "Healthy", color: "#3B7A3B", bg: "#E8F6E8" },
  { v: "issue", label: "Issue", color: "#C8412B", bg: "#FCE4E1" },
  { v: "maintenance", label: "Maintenance", color: "#A77503", bg: "#FFF4D6" },
  { v: "empty", label: "Empty", color: "#6F6F6F", bg: "#E6E6E6" },
];

export default function TowerDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tower, setTower] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("healthy");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);  // base64 data URL
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tRes, lRes] = await Promise.all([
          api.get("/towers"),
          api.get(`/towers/${id}/logs`),
        ]);
        const t = (tRes.data.towers || []).find((x: any) => x.id === id);
        if (t) {
          setTower(t);
          setStatus(t.status || "healthy");
          setNote(t.note || "");
          setPhoto(t.photo_b64 || null);
        }
        setLogs(lRes.data || []);
      } catch (err) {
        console.error("Tower load failed:", err);
      } finally { setLoading(false); }
    })();
  }, [id]);

  // Web-only photo picker via <input type=file>
  const onPickPhoto = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      notify("Web only", "Photo upload is available in the browser.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { notify("Too large", "Photo must be under 2 MB."); return; }
      const reader = new FileReader();
      reader.onload = (ev: any) => setPhoto(ev.target.result);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/towers/${id}`, {
        status,
        note,
        photo_b64: photo,
      });
      notify(
        "Updated",
        status === "issue" ? "Issue logged. Admin will be notified by email." : "Tower status updated"
      );
      router.back();
    } catch (e: any) {
      notify("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.c} edges={["top"]}>
        <View style={s.head}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
          <Text style={s.title}>Tower</Text>
          <View style={{ width: 26 }} />
        </View>
        <ActivityIndicator color={C.brand} size="large" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  if (!tower) {
    return (
      <SafeAreaView style={s.c} edges={["top"]}>
        <View style={s.head}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
          <Text style={s.title}>Tower not found</Text>
          <View style={{ width: 26 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} testID="tower-close"><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Row {tower.row} · Tower {tower.position}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
          <Text style={s.label}>STATUS</Text>
          <View style={s.statusRow}>
            {STATUSES.map((opt) => (
              <TouchableOpacity
                key={opt.v}
                style={[s.statusBtn, { backgroundColor: opt.bg }, status === opt.v && { borderColor: opt.color, borderWidth: 2 }]}
                onPress={() => setStatus(opt.v)}
                testID={`status-${opt.v}`}
              >
                <Text style={[s.statusBtnText, { color: opt.color }]}>{opt.label}</Text>
                {status === opt.v && <Ionicons name="checkmark-circle" size={16} color={opt.color} style={{ marginTop: 3 }} />}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>NOTE</Text>
          <TextInput
            style={[s.input, { minHeight: 80 }]}
            value={note}
            onChangeText={setNote}
            placeholder={status === "issue" ? "Describe the issue (e.g. pump leak, low EC...)" : "Optional note..."}
            placeholderTextColor={C.textMuted}
            multiline
            testID="tower-note"
          />

          <Text style={s.label}>PHOTO</Text>
          <TouchableOpacity style={s.photoBox} onPress={onPickPhoto} testID="tower-photo-pick">
            {photo ? (
              <Image source={{ uri: photo }} style={s.photoPreview} resizeMode="cover" />
            ) : (
              <View style={s.photoEmpty}>
                <Ionicons name="camera" size={32} color={C.textMuted} />
                <Text style={s.photoText}>Add photo (issue evidence, max 2 MB)</Text>
              </View>
            )}
          </TouchableOpacity>
          {photo && (
            <TouchableOpacity onPress={() => setPhoto(null)} style={s.photoRemove}>
              <Text style={{ color: C.danger, fontWeight: "700", fontSize: 12 }}>Remove photo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[s.save, status === "issue" && { backgroundColor: C.danger }]} onPress={save} disabled={saving} testID="tower-save">
            <Text style={s.saveText}>{saving ? "Saving..." : status === "issue" ? "Report issue" : "Update status"}</Text>
          </TouchableOpacity>

          {logs.length > 0 && (
            <View style={s.logsBlock}>
              <Text style={s.section}>STATUS HISTORY ({logs.length})</Text>
              {logs.map((l) => {
                let when = "";
                try { when = format(new Date(l.at), "MMM d, yyyy · h:mm a"); } catch { /* ignore */ }
                return (
                  <View key={l.id} style={s.logRow}>
                    <Text style={s.logText}>{l.prev_status} → <Text style={{ fontWeight: "800" }}>{l.new_status}</Text></Text>
                    {l.note ? <Text style={s.logNote}>"{l.note}"</Text> : null}
                    <Text style={s.logMeta}>{when} · by {l.by_user_name || "?"}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 17, fontWeight: "800", color: C.text },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.md, marginBottom: 8 },
  section: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginBottom: 10 },
  statusRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusBtn: { flex: 1, minWidth: "23%", padding: 14, borderRadius: 12, alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  statusBtnText: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 15, color: C.text },
  photoBox: { backgroundColor: C.card, borderRadius: 14, borderWidth: 2, borderColor: C.border, borderStyle: "dashed", overflow: "hidden", minHeight: 140 },
  photoPreview: { width: "100%", height: 220 },
  photoEmpty: { alignItems: "center", justifyContent: "center", padding: 30, gap: 8 },
  photoText: { fontSize: 12, color: C.text2 },
  photoRemove: { alignSelf: "center", marginTop: 6 },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 18 },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  logsBlock: { marginTop: 24 },
  logRow: { backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  logText: { fontSize: 13, color: C.text },
  logNote: { fontSize: 12, color: C.text2, fontStyle: "italic", marginTop: 2 },
  logMeta: { fontSize: 10, color: C.textMuted, marginTop: 3 },
});
