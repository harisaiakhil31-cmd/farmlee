import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";

export default function WeeklyCheck() {
  const router = useRouter();
  const [meter, setMeter] = useState(false);
  const [nutrition, setNutrition] = useState(false);
  const [nutritionNote, setNutritionNote] = useState("");
  const [filters, setFilters] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/checks/weekly", {
        check_date: format(new Date(), "yyyy-MM-dd"),
        meter_calibration_done: meter,
        nutrition_quantity_ok: nutrition,
        nutrition_notes: nutritionNote,
        tank_filters_cleaned: filters,
        notes,
      });
      Alert.alert("Saved", "Weekly check logged");
      router.back();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={styles.title}>Weekly check</Text>
        <View style={{ width: 26 }} />
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
            <Text style={styles.saveText}>{saving ? "Saving..." : "Save weekly check"}</Text>
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
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.toggleDot, value && styles.toggleDotOn]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
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
