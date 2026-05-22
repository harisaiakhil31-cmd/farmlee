import { useEffect, useState } from "react";
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform, Modal,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, addDays } from "date-fns";
import { api } from "../src/api";
import { C, S } from "../src/theme";

type SType = { id: string; name: string; total_days_to_tower: number; stages: any[] };

export default function NewBatch() {
  const router = useRouter();
  const [types, setTypes] = useState<SType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [batchName, setBatchName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [sownDate, setSownDate] = useState(new Date());
  const [trayLoc, setTrayLoc] = useState("");
  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/seedlings/types").then(r => {
      setTypes(r.data || []);
      if (r.data?.length) setSelectedTypeId(r.data[0].id);
    }).catch((err) => { console.error("Seedling types fetch failed:", err); });
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const selectedType = types.find(t => t.id === selectedTypeId);
  const expectedTx = selectedType ? format(addDays(sownDate, selectedType.total_days_to_tower), "MMM d, yyyy") : "-";

  const save = async () => {
    if (!selectedTypeId) return Alert.alert("Required", "Pick a plant type");
    if (!batchName.trim()) return Alert.alert("Required", "Enter a batch name (e.g. 'Lettuce Batch 1')");
    setSaving(true);
    try {
      await api.post("/seedlings/batches", {
        seedling_type_id: selectedTypeId,
        batch_name: batchName.trim(),
        quantity: parseInt(quantity) || 0,
        sown_date: format(sownDate, "yyyy-MM-dd"),
        tray_location: trayLoc.trim(),
        notes: notes.trim(),
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>New seedling batch</Text>
        <View style={{ width: 26 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>PLANT TYPE</Text>
          <View style={s.typesRow}>
            {types.length === 0 ? (
              <Text style={s.empty}>No plant types — go back and tap the gear icon to add one.</Text>
            ) : types.map(t => {
              const sel = t.id === selectedTypeId;
              return (
                <TouchableOpacity key={t.id} style={[s.typeChip, sel && s.typeChipActive]} onPress={() => setSelectedTypeId(t.id)}>
                  <Text style={[s.typeText, sel && s.typeTextActive]}>{t.name}</Text>
                  <Text style={[s.typeDays, sel && { color: "#fff" }]}>{t.total_days_to_tower}d</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.label}>BATCH NAME</Text>
          <TextInput value={batchName} onChangeText={setBatchName} style={s.input} placeholder="e.g. Lettuce Batch 1" placeholderTextColor={C.textMuted} />

          <Text style={s.label}>QUANTITY (plants)</Text>
          <TextInput value={quantity} onChangeText={setQuantity} style={s.input} placeholder="e.g. 50" placeholderTextColor={C.textMuted} keyboardType="number-pad" />

          <Text style={s.label}>SOWN DATE</Text>
          <TouchableOpacity style={s.input} onPress={() => setPickerOpen(true)}>
            <Text style={{ fontSize: 16, color: C.text }}>{format(sownDate, "EEE, MMM d, yyyy")}</Text>
          </TouchableOpacity>
          <Text style={s.helper}>Expected transplant: {expectedTx}</Text>

          <Text style={s.label}>TRAY LOCATION (optional)</Text>
          <TextInput value={trayLoc} onChangeText={setTrayLoc} style={s.input} placeholder="e.g. Tray-1, Shelf A" placeholderTextColor={C.textMuted} />

          <Text style={s.label}>NOTES (optional)</Text>
          <TextInput value={notes} onChangeText={setNotes} style={[s.input, { minHeight: 80, textAlignVertical: "top" }]} placeholder="Any observations or special instructions" placeholderTextColor={C.textMuted} multiline />

          <TouchableOpacity style={[s.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            <Text style={s.btnText}>{saving ? "Saving..." : "Create batch"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {pickerOpen && Platform.OS !== "web" && (
        <DateTimePicker
          value={sownDate} mode="date" maximumDate={new Date()}
          onChange={(_, d) => { if (d) setSownDate(d); setPickerOpen(false); }}
        />
      )}
      {pickerOpen && Platform.OS === "web" && (
        <Modal transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <View style={s.modalBg}>
            <View style={s.modalCard}>
              <Text style={s.modalT}>Pick sown date</Text>
              {/* @ts-ignore */}
              <input type="date" value={format(sownDate, "yyyy-MM-dd")} max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e: any) => { const d = new Date(e.target.value); if (!isNaN(d.getTime())) setSownDate(d); }}
                style={{ padding: 12, fontSize: 16, border: `1px solid ${C.border}`, borderRadius: 10, width: "100%" } as any} />
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={s.modalBtn}><Text style={s.modalBtnT}>Done</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: "700", color: C.text },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 1.5, marginTop: S.md, marginBottom: 6 },
  helper: { fontSize: 12, color: C.accent, marginTop: 4, fontWeight: "600" },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 16, color: C.text },
  typesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", minWidth: 90 },
  typeChipActive: { backgroundColor: C.brand, borderColor: C.brand },
  typeText: { fontSize: 14, fontWeight: "700", color: C.text },
  typeTextActive: { color: "#fff" },
  typeDays: { fontSize: 10, color: C.text2, marginTop: 2, fontWeight: "600" },
  empty: { color: C.text2, fontSize: 13 },
  btn: { marginTop: S.lg, backgroundColor: C.brand, borderRadius: 14, padding: 16, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: S.md },
  modalCard: { backgroundColor: C.card, borderRadius: 16, padding: S.md, width: "100%", maxWidth: 360, gap: 12 },
  modalT: { fontSize: 16, fontWeight: "700", color: C.text },
  modalBtn: { backgroundColor: C.brand, borderRadius: 10, padding: 12, alignItems: "center" },
  modalBtnT: { color: "#fff", fontWeight: "700" },
});
