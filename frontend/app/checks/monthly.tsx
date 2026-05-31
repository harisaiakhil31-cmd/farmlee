import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";
import HistoryList from "../../src/HistoryList";

export default function MonthlyCheck() {
  const router = useRouter();
  const [tanksClean, setTanksClean] = useState(false);
  const [salt, setSalt] = useState(false); const [saltNote, setSaltNote] = useState("");
  const [a, setA] = useState(""); const [b, setB] = useState(""); const [cc, setCc] = useState("");
  const [solOrdered, setSolOrdered] = useState(false);
  const [seedsOk, setSeedsOk] = useState(false); const [seedsOrdered, setSeedsOrdered] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const resetForm = () => {
    setEditingId(null);
    setTanksClean(false); setSalt(false); setSaltNote("");
    setA(""); setB(""); setCc(""); setSolOrdered(false);
    setSeedsOk(false); setSeedsOrdered(false); setNotes("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        check_date: format(new Date(), "yyyy-MM-dd"),
        tanks_cleaned: tanksClean,
        salt_formation_ok: salt,
        salt_notes: saltNote,
        solution_a_qty: a ? parseFloat(a) : null,
        solution_b_qty: b ? parseFloat(b) : null,
        solution_c_qty: cc ? parseFloat(cc) : null,
        solutions_ordered: solOrdered,
        seeds_qty_ok: seedsOk,
        seeds_ordered: seedsOrdered,
        notes,
      };
      if (editingId) {
        await api.put(`/checks/monthly/${editingId}`, payload);
        Alert.alert("Updated", "Monthly check updated");
      } else {
        await api.post("/checks/monthly", payload);
        Alert.alert("Saved", "Monthly check logged");
      }
      resetForm();
      setHistoryKey((k) => k + 1);
      router.back();
    } catch (e: any) { Alert.alert("Failed", e?.response?.data?.detail || "Try again"); }
    finally { setSaving(false); }
  };

  const onEdit = (item: any) => {
    setEditingId(item.id);
    setTanksClean(!!item.tanks_cleaned);
    setSalt(!!item.salt_formation_ok); setSaltNote(item.salt_notes || "");
    setA(item.solution_a_qty != null ? String(item.solution_a_qty) : "");
    setB(item.solution_b_qty != null ? String(item.solution_b_qty) : "");
    setCc(item.solution_c_qty != null ? String(item.solution_c_qty) : "");
    setSolOrdered(!!item.solutions_ordered);
    setSeedsOk(!!item.seeds_qty_ok); setSeedsOrdered(!!item.seeds_ordered);
    setNotes(item.notes || "");
    setHistoryOpen(false);
  };

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={styles.title}>{editingId ? "Edit monthly check" : "Monthly check"}</Text>
        <TouchableOpacity onPress={() => setHistoryOpen(true)} style={styles.headIcon} testID="monthly-history-btn">
          <Ionicons name="time-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md }}>
          <Text style={styles.section}>TANKS & MAINTENANCE</Text>
          <Toggle label="Tanks cleaned" value={tanksClean} onChange={setTanksClean} testID="m-tanks" />
          <Toggle label="Salt formation OK" value={salt} onChange={setSalt} testID="m-salt" />
          <TextInput style={styles.notes} placeholder="Salt notes..." placeholderTextColor={C.textMuted}
            value={saltNote} onChangeText={setSaltNote} multiline />

          <Text style={styles.section}>SOLUTIONS QTY (L)</Text>
          <View style={styles.row}>
            <Qty label="A" value={a} setValue={setA} testID="sol-a" />
            <Qty label="B" value={b} setValue={setB} testID="sol-b" />
            <Qty label="C" value={cc} setValue={setCc} testID="sol-c" />
          </View>
          <Toggle label="A/B/C solutions ordered" value={solOrdered} onChange={setSolOrdered} testID="m-sol-order" />

          <Text style={styles.section}>SEEDS</Text>
          <Toggle label="Seeds quantity OK" value={seedsOk} onChange={setSeedsOk} testID="m-seeds-ok" />
          <Toggle label="Seeds ordered" value={seedsOrdered} onChange={setSeedsOrdered} testID="m-seeds-order" />

          <Text style={styles.section}>NOTES</Text>
          <TextInput style={[styles.notes, { minHeight: 80 }]} placeholder="General notes..." placeholderTextColor={C.textMuted}
            value={notes} onChangeText={setNotes} multiline />

          <TouchableOpacity style={styles.save} onPress={save} disabled={saving} testID="monthly-save">
            <Text style={styles.saveText}>{saving ? "Saving..." : editingId ? "Update monthly check" : "Save monthly check"}</Text>
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
        title="Monthly checks · history"
        endpoint="/checks/monthly"
        renderItem={(it: any) => ({
          line1: `Tanks ${it.tanks_cleaned ? "✓" : "—"} · Salt ${it.salt_formation_ok ? "✓" : "—"} · Sol ordered ${it.solutions_ordered ? "✓" : "—"} · Seeds ordered ${it.seeds_ordered ? "✓" : "—"}`,
          line2: `A ${it.solution_a_qty ?? "–"}L · B ${it.solution_b_qty ?? "–"}L · C ${it.solution_c_qty ?? "–"}L`,
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
      <View style={[styles.toggle, value && styles.toggleOn]}><View style={[styles.toggleDot, value && styles.toggleDotOn]} /></View>
    </TouchableOpacity>
  );
}

function Qty({ label, value, setValue, testID }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.qLabel}>Solution {label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="L" placeholderTextColor={C.textMuted} testID={testID} />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: "700", color: C.text },
  section: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.md, marginBottom: S.sm },
  tRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  tLabel: { fontSize: 15, color: C.text, fontWeight: "500" },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: C.bg3, padding: 2 },
  toggleOn: { backgroundColor: C.brand },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleDotOn: { transform: [{ translateX: 18 }] },
  notes: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 14, color: C.text, marginBottom: 10, minHeight: 60 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  qLabel: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 1, marginBottom: 4 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 15, color: C.text },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: S.lg },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
