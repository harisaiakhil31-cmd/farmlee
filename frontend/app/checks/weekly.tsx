import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";
import HistoryList from "../../src/HistoryList";

export default function WeeklyCheck() {
  const router = useRouter();
  const [meter, setMeter] = useState(false);
  const [nutrition, setNutrition] = useState(false);
  const [nutritionNote, setNutritionNote] = useState("");
  const [filters, setFilters] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const resetForm = () => {
    setEditingId(null);
    setMeter(false); setNutrition(false); setNutritionNote("");
    setFilters(false); setNotes("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        check_date: format(new Date(), "yyyy-MM-dd"),
        meter_calibration_done: meter,
        nutrition_quantity_ok: nutrition,
        nutrition_notes: nutritionNote,
        tank_filters_cleaned: filters,
        notes,
      };
      if (editingId) {
        await api.put(`/checks/weekly/${editingId}`, payload);
        Alert.alert("Updated", "Weekly check updated");
      } else {
        await api.post("/checks/weekly", payload);
        Alert.alert("Saved", "Weekly check logged");
      }
      resetForm();
      setHistoryKey((k) => k + 1);
      router.back();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  const onEdit = (item: any) => {
    setEditingId(item.id);
    setMeter(!!item.meter_calibration_done);
    setNutrition(!!item.nutrition_quantity_ok); setNutritionNote(item.nutrition_notes || "");
    setFilters(!!item.tank_filters_cleaned);
    setNotes(item.notes || "");
    setHistoryOpen(false);
  };

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={styles.title}>{editingId ? "Edit weekly check" : "Weekly check"}</Text>
        <TouchableOpacity onPress={() => setHistoryOpen(true)} style={styles.headIcon} testID="weekly-history-btn">
          <Ionicons name="time-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md }}>
          <Toggle label="Meters calibrated" value={meter} onChange={setMeter} testID="w-meter" />
          <Toggle label="Nutrition quantity OK" value={nutrition} onChange={setNutrition} testID="w-nut" />
          <TextInput style={styles.notes} placeholder="Nutrition notes..." placeholderTextColor={C.textMuted}
            value={nutritionNote} onChangeText={setNutritionNote} multiline />
          <Toggle label="Tank filters cleaned" value={filters} onChange={setFilters} testID="w-filters" />
          <TextInput style={[styles.notes, { minHeight: 80 }]} placeholder="General notes..." placeholderTextColor={C.textMuted}
            value={notes} onChangeText={setNotes} multiline />
          <TouchableOpacity style={styles.save} onPress={save} disabled={saving} testID="weekly-save">
            <Text style={styles.saveText}>{saving ? "Saving..." : editingId ? "Update weekly check" : "Save weekly check"}</Text>
          </TouchableOpacity>
          {editingId && (
            <TouchableOpacity onPress={resetForm} style={{ alignSelf: "center", marginTop: 8 }}>
              <Text style={{ color: C.danger, fontWeight: "700" }}>Cancel edit</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <HistoryList
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Weekly checks · history"
        endpoint="/checks/weekly"
        renderItem={(it: any) => ({
          line1: `Meter ${it.meter_calibration_done ? "✓" : "—"} · Nutrition ${it.nutrition_quantity_ok ? "✓" : "—"} · Filters ${it.tank_filters_cleaned ? "✓" : "—"}`,
          line2: it.nutrition_notes ? `Nutrition: ${it.nutrition_notes}` : undefined,
          line3: it.notes ? `Notes: ${it.notes}` : undefined,
        })}
        onEdit={onEdit}
        refreshKey={historyKey}
      />
    </SafeAreaView>
  );
}

function Toggle({ label, value, onChange, testID }: any) {
  return (
    <TouchableOpacity style={styles.tRow} onPress={() => onChange(!value)} testID={testID}>
      <Text style={styles.tLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.toggleDot, value && styles.toggleDotOn]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  headIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: C.text },
  tRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  tLabel: { fontSize: 15, color: C.text, fontWeight: "500" },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: C.bg3, padding: 2 },
  toggleOn: { backgroundColor: C.brand },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleDotOn: { transform: [{ translateX: 18 }] },
  notes: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 14, color: C.text, marginBottom: 10, minHeight: 60 },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: S.lg },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
