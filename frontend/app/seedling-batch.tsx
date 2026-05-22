import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import { api } from "../src/api";
import { C, S } from "../src/theme";

export default function BatchDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [waterOpen, setWaterOpen] = useState<"morning" | "evening" | null>(null);
  const [txOpen, setTxOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/seedlings/batches/${id}`);
      setBatch(r.data);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Could not load batch");
    } finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = () => {
    Alert.alert("Delete batch?", "This removes the batch and all its watering logs. Cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try { await api.delete(`/seedlings/batches/${id}`); router.back(); }
          catch (e: any) { Alert.alert("Failed", e?.response?.data?.detail || "Try again"); }
        },
      },
    ]);
  };

  if (loading || !batch) {
    return (
      <SafeAreaView style={s.c}><ActivityIndicator color={C.brand} style={{ marginTop: 80 }} /></SafeAreaView>
    );
  }

  const t = batch.seedling_type || {};
  const p = batch.progress || {};
  const stages = t.stages || [];
  const isActive = batch.status === "active";
  const logs = batch.watering_logs || [];
  const stageIdx = p.current_stage_index ?? 0;
  const curStage = p.current_stage;

  // Group logs by date
  const logsByDate: Record<string, any[]> = {};
  for (const lg of logs) {
    (logsByDate[lg.log_date] = logsByDate[lg.log_date] || []).push(lg);
  }

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={C.text} /></TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{batch.batch_name}</Text>
        <TouchableOpacity onPress={onDelete}><Ionicons name="trash-outline" size={22} color={C.danger} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 120 }}>
        {/* Summary */}
        <View style={s.summary}>
          <View style={{ flex: 1 }}>
            <Text style={s.type}>{batch.seedling_type_name}</Text>
            <Text style={s.qty}>{batch.quantity} plants {batch.tray_location ? "· " + batch.tray_location : ""}</Text>
            <View style={s.dates}>
              <Text style={s.dateT}>Sown {format(parseISO(batch.sown_date), "MMM d, yyyy")}</Text>
              {batch.expected_transplant_date && <Text style={s.dateT}>Expected TX {format(parseISO(batch.expected_transplant_date), "MMM d")}</Text>}
              {batch.actual_transplant_date && <Text style={[s.dateT, { color: C.brand }]}>Actual TX {format(parseISO(batch.actual_transplant_date), "MMM d")}</Text>}
            </View>
          </View>
        </View>

        {/* Stage progress */}
        {stages.length > 0 && (
          <>
            <Text style={s.section}>STAGE PROGRESS</Text>
            <View style={s.stagesCard}>
              {stages.map((st: any, i: number) => {
                const active = i === stageIdx && isActive;
                const done = i < stageIdx || !isActive;
                return (
                  <View key={i} style={s.stageItem}>
                    <View style={[s.dot, done && { backgroundColor: C.brand }, active && { backgroundColor: C.accent, transform: [{ scale: 1.3 }] }]} />
                    {i < stages.length - 1 && <View style={[s.line, done && { backgroundColor: C.brand }]} />}
                    <View style={{ flex: 1, paddingBottom: i < stages.length - 1 ? 14 : 0 }}>
                      <Text style={[s.stageN, active && { color: C.accent, fontWeight: "800" }]}>{st.stage_name}</Text>
                      <Text style={s.stageM}>{st.duration_days}d · EC {st.ec_min}–{st.ec_max}{st.water_temp_min ? ` · ${st.water_temp_min}–${st.water_temp_max}°C` : ""}</Text>
                      {active && curStage && <Text style={s.stageActive}>Day {p.day_in_stage} of {st.duration_days}</Text>}
                      {st.notes ? <Text style={s.stageNote}>{st.notes}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Today's actions */}
        {isActive && (
          <>
            <Text style={s.section}>LOG WATERING</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#FFF4EC", borderColor: "#F0D6BE" }]} onPress={() => setWaterOpen("morning")} testID="log-morning-btn">
                <Ionicons name="sunny-outline" size={22} color={C.accent} />
                <Text style={[s.actionT, { color: C.accent }]}>Morning</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#EFF3DC", borderColor: "#D9DFB8" }]} onPress={() => setWaterOpen("evening")} testID="log-evening-btn">
                <Ionicons name="moon-outline" size={22} color={C.brand} />
                <Text style={[s.actionT, { color: C.brand }]}>Evening</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[s.txBtn]} onPress={() => setTxOpen(true)} testID="transplant-btn">
              <Ionicons name="git-network-outline" size={20} color="#fff" />
              <Text style={s.txT}>Mark as transplanted</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Watering history */}
        <Text style={s.section}>WATERING HISTORY ({logs.length})</Text>
        {logs.length === 0 ? (
          <Text style={s.empty}>No watering logs yet.</Text>
        ) : Object.keys(logsByDate).sort((a, b) => b.localeCompare(a)).map(date => (
          <View key={date} style={s.dayBlock}>
            <Text style={s.dayLabel}>{format(parseISO(date), "EEE, MMM d, yyyy")}</Text>
            {logsByDate[date].map((lg: any) => (
              <View key={lg.id} style={s.logRow}>
                <Ionicons name={lg.session === "morning" ? "sunny" : "moon"} size={18} color={lg.session === "morning" ? C.accent : C.brand} />
                <View style={{ flex: 1 }}>
                  <Text style={s.logTitle}>{lg.session === "morning" ? "Morning" : "Evening"} {lg.watered ? "" : "(skipped)"}</Text>
                  <Text style={s.logMeta}>
                    {lg.ec_actual != null ? `EC ${lg.ec_actual}` : ""}
                    {lg.ec_target_min != null ? ` / target ${lg.ec_target_min}-${lg.ec_target_max}` : ""}
                    {lg.water_temp_before != null ? ` · ${lg.water_temp_before}°C` : ""}
                  </Text>
                  {lg.notes ? <Text style={s.logNote}>{lg.notes}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Watering modal */}
      {waterOpen && (
        <WateringModal
          batchId={String(id)}
          session={waterOpen}
          stage={curStage}
          onClose={() => setWaterOpen(null)}
          onSaved={() => { setWaterOpen(null); load(); }}
        />
      )}

      {/* Transplant modal */}
      {txOpen && (
        <TransplantModal batchId={String(id)} onClose={() => setTxOpen(false)} onSaved={() => { setTxOpen(false); load(); }} />
      )}
    </SafeAreaView>
  );
}

function WateringModal({ batchId, session, stage, onClose, onSaved }: any) {
  const [date, setDate] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [watered, setWatered] = useState(true);
  const [ecBefore, setEcBefore] = useState("");
  const [tempBefore, setTempBefore] = useState("");
  const [ecActual, setEcActual] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/seedlings/watering", {
        batch_id: batchId,
        log_date: format(date, "yyyy-MM-dd"),
        session,
        watered,
        ec_before: ecBefore ? parseFloat(ecBefore) : null,
        water_temp_before: tempBefore ? parseFloat(tempBefore) : null,
        ec_target_min: stage?.ec_min ?? null,
        ec_target_max: stage?.ec_max ?? null,
        ec_actual: ecActual ? parseFloat(ecActual) : null,
        notes: notes.trim(),
      });
      onSaved();
    } catch (e: any) {
      Alert.alert("Save failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose}>
      <View style={m.bg}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={m.cardWrap}>
          <View style={m.card}>
            <View style={m.head}>
              <Text style={m.title}>{session === "morning" ? "Morning" : "Evening"} watering</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={m.label}>DATE</Text>
              <TouchableOpacity style={m.input} onPress={() => setPickerOpen(true)}>
                <Text style={{ fontSize: 15, color: C.text }}>{format(date, "EEE, MMM d, yyyy")}</Text>
              </TouchableOpacity>

              <View style={m.switchRow}>
                <Text style={m.label}>WATERED?</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity onPress={() => setWatered(true)} style={[m.sw, watered && m.swActive]}><Text style={[m.swT, watered && m.swTActive]}>Yes</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setWatered(false)} style={[m.sw, !watered && m.swActive]}><Text style={[m.swT, !watered && m.swTActive]}>No</Text></TouchableOpacity>
                </View>
              </View>

              {stage && (
                <Text style={m.helper}>Target EC for {stage.stage_name}: {stage.ec_min}–{stage.ec_max}</Text>
              )}

              <Text style={m.label}>EC BEFORE WATERING</Text>
              <TextInput style={m.input} value={ecBefore} onChangeText={setEcBefore} placeholder="e.g. 0.7" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />

              <Text style={m.label}>WATER TEMP (°C)</Text>
              <TextInput style={m.input} value={tempBefore} onChangeText={setTempBefore} placeholder="e.g. 21" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />

              <Text style={m.label}>EC ACTUAL (after mixing)</Text>
              <TextInput style={m.input} value={ecActual} onChangeText={setEcActual} placeholder="e.g. 0.9" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />

              <Text style={m.label}>NOTES</Text>
              <TextInput style={[m.input, { minHeight: 70, textAlignVertical: "top" }]} value={notes} onChangeText={setNotes} placeholder="Optional" placeholderTextColor={C.textMuted} multiline />

              <TouchableOpacity style={[m.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
                <Text style={m.btnT}>{saving ? "Saving..." : "Save log"}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
      {pickerOpen && Platform.OS !== "web" && (
        <DateTimePicker value={date} mode="date" maximumDate={new Date()} onChange={(_, d) => { if (d) setDate(d); setPickerOpen(false); }} />
      )}
      {pickerOpen && Platform.OS === "web" && (
        <Modal transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <View style={m.bg}>
            <View style={[m.card, { padding: S.md }]}>
              <Text style={m.title}>Pick date</Text>
              {/* @ts-ignore */}
              <input type="date" value={format(date, "yyyy-MM-dd")} max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e: any) => { const d = new Date(e.target.value); if (!isNaN(d.getTime())) setDate(d); }}
                style={{ padding: 12, fontSize: 16, border: `1px solid ${C.border}`, borderRadius: 10, marginTop: 12 } as any} />
              <TouchableOpacity onPress={() => setPickerOpen(false)} style={[m.btn, { marginTop: 12 }]}><Text style={m.btnT}>Done</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

function TransplantModal({ batchId, onClose, onSaved }: any) {
  const [date, setDate] = useState(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tower, setTower] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/seedlings/batches/${batchId}/transplant`, {
        actual_transplant_date: format(date, "yyyy-MM-dd"),
        tower_destination: tower.trim(),
        notes: notes.trim(),
      });
      onSaved();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose}>
      <View style={m.bg}>
        <View style={m.card}>
          <View style={m.head}>
            <Text style={m.title}>Mark as transplanted</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
          </View>
          <Text style={m.label}>TRANSPLANT DATE</Text>
          <TouchableOpacity style={m.input} onPress={() => setPickerOpen(true)}>
            <Text style={{ fontSize: 15, color: C.text }}>{format(date, "EEE, MMM d, yyyy")}</Text>
          </TouchableOpacity>
          <Text style={m.label}>TOWER / LOCATION</Text>
          <TextInput style={m.input} value={tower} onChangeText={setTower} placeholder="e.g. Tower 1, A row" placeholderTextColor={C.textMuted} />
          <Text style={m.label}>NOTES</Text>
          <TextInput style={[m.input, { minHeight: 70, textAlignVertical: "top" }]} value={notes} onChangeText={setNotes} multiline placeholder="Optional" placeholderTextColor={C.textMuted} />
          <TouchableOpacity style={[m.btn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
            <Text style={m.btnT}>{saving ? "Saving..." : "Confirm transplant"}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {pickerOpen && Platform.OS !== "web" && (
        <DateTimePicker value={date} mode="date" maximumDate={new Date()} onChange={(_, d) => { if (d) setDate(d); setPickerOpen(false); }} />
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 },
  title: { fontSize: 17, fontWeight: "800", color: C.text, flex: 1, textAlign: "center" },
  summary: { backgroundColor: C.card, borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.border },
  type: { fontSize: 22, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  qty: { fontSize: 13, color: C.text2, marginTop: 2, fontWeight: "600" },
  dates: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  dateT: { fontSize: 11, color: C.text2, fontWeight: "700", backgroundColor: C.bg2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  section: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.lg, marginBottom: 8 },
  stagesCard: { backgroundColor: C.card, borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.border },
  stageItem: { flexDirection: "row", gap: 12, position: "relative" },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.border, marginTop: 4 },
  line: { position: "absolute", left: 5, top: 16, bottom: -4, width: 2, backgroundColor: C.border },
  stageN: { fontSize: 15, fontWeight: "700", color: C.text },
  stageM: { fontSize: 12, color: C.text2, marginTop: 2, fontWeight: "600" },
  stageActive: { fontSize: 11, color: C.accent, fontWeight: "700", marginTop: 4 },
  stageNote: { fontSize: 11, color: C.text2, marginTop: 4, fontStyle: "italic" },
  actionBtn: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  actionT: { fontSize: 14, fontWeight: "700" },
  txBtn: { backgroundColor: "#4A5D23", borderRadius: 14, padding: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 8 },
  txT: { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty: { color: C.text2, fontSize: 13, fontStyle: "italic" },
  dayBlock: { marginBottom: 12 },
  dayLabel: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 6 },
  logRow: { flexDirection: "row", gap: 10, backgroundColor: C.card, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border, marginBottom: 6, alignItems: "flex-start" },
  logTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  logMeta: { fontSize: 11, color: C.text2, marginTop: 2 },
  logNote: { fontSize: 11, color: C.text2, marginTop: 2, fontStyle: "italic" },
});

const m = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  cardWrap: { width: "100%" },
  card: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: S.md, maxHeight: "90%" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "800", color: C.text },
  label: { fontSize: 10, fontWeight: "700", color: C.text2, letterSpacing: 1.5, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 15, color: C.text },
  helper: { fontSize: 12, color: C.accent, fontWeight: "600", marginTop: 8 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  sw: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  swActive: { backgroundColor: C.brand, borderColor: C.brand },
  swT: { fontSize: 13, fontWeight: "700", color: C.text },
  swTActive: { color: "#fff" },
  btn: { backgroundColor: C.brand, borderRadius: 14, padding: 14, alignItems: "center", marginTop: 16 },
  btnT: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
