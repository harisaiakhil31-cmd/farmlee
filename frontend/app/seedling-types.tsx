import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { C, S } from "../src/theme";

export default function SeedlingTypes() {
  const router = useRouter();
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api.get("/seedlings/types"); setTypes(r.data || []); }
    catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = (t: any) => {
    Alert.alert("Delete plant type?", `Remove '${t.name}'? Active batches will block deletion.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try { await api.delete(`/seedlings/types/${t.id}`); load(); }
          catch (e: any) { Alert.alert("Failed", e?.response?.data?.detail || "Try again"); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Plant types</Text>
        <TouchableOpacity onPress={() => setCreating(true)} testID="add-type-btn"><Ionicons name="add" size={26} color={C.brand} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
        <Text style={s.helper}>Templates that define growth stages, durations and EC targets for each plant.</Text>
        {loading ? <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} /> : types.length === 0 ? (
          <Text style={s.empty}>No plant types yet — tap + to add one.</Text>
        ) : types.map(t => (
          <View key={t.id} style={s.card}>
            <View style={s.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{t.name}</Text>
                <Text style={s.meta}>{t.total_days_to_tower}d total · {t.stages?.length || 0} stages</Text>
                {t.description ? <Text style={s.desc}>{t.description}</Text> : null}
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <TouchableOpacity onPress={() => setEditing(t)} style={s.iconBtn}><Ionicons name="create-outline" size={20} color={C.text} /></TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(t)} style={s.iconBtn}><Ionicons name="trash-outline" size={20} color={C.danger} /></TouchableOpacity>
              </View>
            </View>
            {(t.stages || []).map((st: any, i: number) => (
              <View key={i} style={s.stage}>
                <Text style={s.stageIdx}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.stageName}>{st.stage_name}</Text>
                  <Text style={s.stageMeta}>{st.duration_days}d · EC {st.ec_min}–{st.ec_max}{st.water_temp_min ? ` · ${st.water_temp_min}–${st.water_temp_max}°C` : ""}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {(creating || editing) && (
        <TypeEditor existing={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); load(); }} />
      )}
    </SafeAreaView>
  );
}

function TypeEditor({ existing, onClose, onSaved }: any) {
  const [name, setName] = useState(existing?.name || "");
  const [desc, setDesc] = useState(existing?.description || "");
  const [totalDays, setTotalDays] = useState(String(existing?.total_days_to_tower || 21));
  const [stages, setStages] = useState<any[]>(existing?.stages || [
    { stage_name: "Germination", order_index: 0, duration_days: 5, ec_min: 0.2, ec_max: 0.4, water_temp_min: 20, water_temp_max: 24, notes: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const updateStage = (i: number, key: string, val: any) => {
    const arr = [...stages]; arr[i] = { ...arr[i], [key]: val }; setStages(arr);
  };
  const addStage = () => setStages([...stages, { stage_name: "New stage", order_index: stages.length, duration_days: 5, ec_min: 0.5, ec_max: 1.0, water_temp_min: 20, water_temp_max: 24, notes: "" }]);
  const removeStage = (i: number) => setStages(stages.filter((_, idx) => idx !== i).map((st, idx) => ({ ...st, order_index: idx })));

  const save = async () => {
    if (!name.trim()) return Alert.alert("Required", "Enter a name");
    if (stages.length === 0) return Alert.alert("Required", "Add at least one stage");
    setSaving(true);
    try {
      const body = {
        name: name.trim(), description: desc.trim(),
        total_days_to_tower: parseInt(totalDays) || 21,
        stages: stages.map((st, i) => ({
          stage_name: st.stage_name, order_index: i,
          duration_days: parseInt(String(st.duration_days)) || 0,
          ec_min: parseFloat(String(st.ec_min)) || 0,
          ec_max: parseFloat(String(st.ec_max)) || 0,
          water_temp_min: st.water_temp_min ? parseFloat(String(st.water_temp_min)) : null,
          water_temp_max: st.water_temp_max ? parseFloat(String(st.water_temp_max)) : null,
          notes: st.notes || "",
        })),
        notes: "",
      };
      if (existing) await api.put(`/seedlings/types/${existing.id}`, body);
      else await api.post("/seedlings/types", body);
      onSaved();
    } catch (e: any) {
      Alert.alert("Save failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.c} edges={["top"]}>
        <View style={s.head}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
          <Text style={s.title}>{existing ? "Edit type" : "New plant type"}</Text>
          <View style={{ width: 26 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>NAME</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Spinach" placeholderTextColor={C.textMuted} />

            <Text style={s.label}>DESCRIPTION (optional)</Text>
            <TextInput style={[s.input, { minHeight: 60, textAlignVertical: "top" }]} value={desc} onChangeText={setDesc} placeholder="Notes about this plant" placeholderTextColor={C.textMuted} multiline />

            <Text style={s.label}>TOTAL DAYS TO TOWER</Text>
            <TextInput style={s.input} value={totalDays} onChangeText={setTotalDays} keyboardType="number-pad" placeholderTextColor={C.textMuted} />

            <Text style={[s.label, { marginTop: 20, fontSize: 13, letterSpacing: 1 }]}>STAGES ({stages.length})</Text>
            {stages.map((st, i) => (
              <View key={i} style={s.stageBox}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text style={s.stageBoxLabel}>Stage {i + 1}</Text>
                  {stages.length > 1 && (
                    <TouchableOpacity onPress={() => removeStage(i)}><Ionicons name="trash-outline" size={18} color={C.danger} /></TouchableOpacity>
                  )}
                </View>
                <TextInput style={s.input} value={st.stage_name} onChangeText={v => updateStage(i, "stage_name", v)} placeholder="Stage name" placeholderTextColor={C.textMuted} />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  <FieldNum label="DURATION (days)" value={String(st.duration_days)} onChange={v => updateStage(i, "duration_days", v)} />
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  <FieldNum label="EC MIN" value={String(st.ec_min)} onChange={v => updateStage(i, "ec_min", v)} />
                  <FieldNum label="EC MAX" value={String(st.ec_max)} onChange={v => updateStage(i, "ec_max", v)} />
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  <FieldNum label="TEMP MIN (°C)" value={String(st.water_temp_min || "")} onChange={v => updateStage(i, "water_temp_min", v)} />
                  <FieldNum label="TEMP MAX (°C)" value={String(st.water_temp_max || "")} onChange={v => updateStage(i, "water_temp_max", v)} />
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.addStage} onPress={addStage}>
              <Ionicons name="add-circle-outline" size={20} color={C.brand} />
              <Text style={{ color: C.brand, fontWeight: "700" }}>Add stage</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              <Text style={s.btnText}>{saving ? "Saving..." : existing ? "Update plant type" : "Create plant type"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function FieldNum({ label, value, onChange }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.fieldL}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholderTextColor={C.textMuted} />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: "800", color: C.text },
  helper: { fontSize: 12, color: C.text2, marginBottom: 12 },
  empty: { color: C.text2, fontSize: 13, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  cardHead: { flexDirection: "row", gap: 8, marginBottom: 8 },
  name: { fontSize: 18, fontWeight: "800", color: C.text },
  meta: { fontSize: 12, color: C.text2, marginTop: 2, fontWeight: "600" },
  desc: { fontSize: 12, color: C.text2, marginTop: 4, fontStyle: "italic" },
  iconBtn: { padding: 6 },
  stage: { flexDirection: "row", gap: 10, paddingVertical: 6, alignItems: "center" },
  stageIdx: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.brand, color: "#fff", textAlign: "center", lineHeight: 22, fontSize: 11, fontWeight: "800" },
  stageName: { fontSize: 13, fontWeight: "700", color: C.text },
  stageMeta: { fontSize: 11, color: C.text2, marginTop: 1 },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 1.5, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 15, color: C.text },
  stageBox: { backgroundColor: C.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginTop: 8 },
  stageBoxLabel: { fontSize: 13, fontWeight: "800", color: C.text },
  fieldL: { fontSize: 9, fontWeight: "700", color: C.text2, letterSpacing: 1.2, marginBottom: 2 },
  addStage: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, marginTop: 8, borderRadius: 10, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border, borderStyle: "dashed" },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 24 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
