import { useState } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";

const TANKS = [
  { key: "tower_1", label: "Tower 1" }, { key: "tower_2", label: "Tower 2" },
  { key: "tower_3", label: "Tower 3" }, { key: "tower_4", label: "Tower 4" },
  { key: "pad_1", label: "Pad 1" }, { key: "pad_2", label: "Pad 2" },
  { key: "ro_1", label: "RO 1" }, { key: "ro_2", label: "RO 2" },
];

export default function DailyCheck() {
  const router = useRouter();
  const now = new Date();
  const [ph, setPh] = useState(""); const [phMin, setPhMin] = useState("5.5"); const [phMax, setPhMax] = useState("6.5");
  const [ec, setEc] = useState(""); const [ecMin, setEcMin] = useState("1.2"); const [ecMax, setEcMax] = useState("2.5");
  const [temp, setTemp] = useState(""); const [tMin, setTMin] = useState("18"); const [tMax, setTMax] = useState("26");
  const [hum, setHum] = useState(""); const [hMin, setHMin] = useState("50"); const [hMax, setHMax] = useState("75");
  const [seedW, setSeedW] = useState(false); const [seedPh, setSeedPh] = useState(""); const [seedEc, setSeedEc] = useState("");
  const [tanks, setTanks] = useState<any>({});
  const [pestDone, setPestDone] = useState(false); const [pestNote, setPestNote] = useState("");
  const [leafDone, setLeafDone] = useState(false); const [leafNote, setLeafNote] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const inRange = (v: string, min: string, max: string) => {
    const n = parseFloat(v); const mi = parseFloat(min); const ma = parseFloat(max);
    if (isNaN(n) || isNaN(mi) || isNaN(ma)) return true;
    return n >= mi && n <= ma;
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/checks/daily", {
        check_date: format(now, "yyyy-MM-dd"),
        check_time: format(now, "HH:mm"),
        ph_value: ph ? parseFloat(ph) : null,
        ph_range: ph ? { min: parseFloat(phMin), max: parseFloat(phMax) } : null,
        ec_value: ec ? parseFloat(ec) : null,
        ec_range: ec ? { min: parseFloat(ecMin), max: parseFloat(ecMax) } : null,
        temperature: temp ? parseFloat(temp) : null,
        temperature_range: temp ? { min: parseFloat(tMin), max: parseFloat(tMax) } : null,
        humidity: hum ? parseFloat(hum) : null,
        humidity_range: hum ? { min: parseFloat(hMin), max: parseFloat(hMax) } : null,
        seedling_watered: seedW,
        seedling_ph: seedPh ? parseFloat(seedPh) : null,
        seedling_ec: seedEc ? parseFloat(seedEc) : null,
        tank_levels: tanks,
        pest_check_done: pestDone, pest_notes: pestNote,
        leaf_cleaning_done: leafDone, leaf_notes: leafNote,
        notes,
      });
      Alert.alert("Saved", "Daily check logged");
      router.back();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()} testID="daily-back">
          <Ionicons name="close" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Daily check</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: S.md }} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>WATER / ENVIRONMENT</Text>

          <RangeField label="pH" value={ph} setValue={setPh} min={phMin} setMin={setPhMin} max={phMax} setMax={setPhMax} ok={inRange(ph, phMin, phMax)} testID="ph" />
          <RangeField label="EC (mS/cm)" value={ec} setValue={setEc} min={ecMin} setMin={setEcMin} max={ecMax} setMax={setEcMax} ok={inRange(ec, ecMin, ecMax)} testID="ec" />
          <RangeField label="Temperature (°C)" value={temp} setValue={setTemp} min={tMin} setMin={setTMin} max={tMax} setMax={setTMax} ok={inRange(temp, tMin, tMax)} testID="temp" />
          <RangeField label="Humidity (%)" value={hum} setValue={setHum} min={hMin} setMin={setHMin} max={hMax} setMax={setHMax} ok={inRange(hum, hMin, hMax)} testID="hum" />

          <Text style={styles.section}>SEEDLING</Text>
          <Toggle label="Seedlings watered" value={seedW} onChange={setSeedW} testID="seedling-toggle" />
          <View style={styles.row2}>
            <SmallField label="pH" value={seedPh} setValue={setSeedPh} testID="seedling-ph" />
            <SmallField label="EC" value={seedEc} setValue={setSeedEc} testID="seedling-ec" />
          </View>

          <Text style={styles.section}>TANK LEVELS</Text>
          {TANKS.map((t) => (
            <LevelRow key={t.key} label={t.label} value={tanks[t.key]} onChange={(v) => setTanks({ ...tanks, [t.key]: v })} />
          ))}

          <Text style={styles.section}>OBSERVATIONS</Text>
          <Toggle label="Pest check done" value={pestDone} onChange={setPestDone} testID="pest-toggle" />
          <TextInput style={styles.notes} placeholder="Pest notes..." placeholderTextColor={C.textMuted}
            value={pestNote} onChangeText={setPestNote} multiline />

          <Toggle label="Spoiled leaves cleaned" value={leafDone} onChange={setLeafDone} testID="leaf-toggle" />
          <TextInput style={styles.notes} placeholder="Damaged plants notes..." placeholderTextColor={C.textMuted}
            value={leafNote} onChangeText={setLeafNote} multiline />

          <Text style={styles.section}>GENERAL NOTES</Text>
          <TextInput style={[styles.notes, { minHeight: 80 }]} placeholder="Anything else..." placeholderTextColor={C.textMuted}
            value={notes} onChangeText={setNotes} multiline />

          <TouchableOpacity style={styles.save} onPress={save} disabled={saving} testID="daily-save">
            <Text style={styles.saveText}>{saving ? "Saving..." : "Save daily check"}</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RangeField({ label, value, setValue, min, setMin, max, setMax, ok, testID }: any) {
  const bad = value && !ok;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          testID={`${testID}-value`}
          style={[styles.input, { flex: 2 }, bad ? styles.inputBad : null]}
          value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="Reading"
          placeholderTextColor={C.textMuted}
        />
        <TextInput style={[styles.input, { flex: 1 }]} value={min} onChangeText={setMin} keyboardType="decimal-pad" placeholder="Min" placeholderTextColor={C.textMuted} />
        <TextInput style={[styles.input, { flex: 1 }]} value={max} onChangeText={setMax} keyboardType="decimal-pad" placeholder="Max" placeholderTextColor={C.textMuted} />
      </View>
      {value ? (
        <View style={[styles.statusBadge, { backgroundColor: ok ? "#E8F6E8" : "#FCE4E1" }]}>
          <Ionicons name={ok ? "checkmark-circle" : "alert-circle"} size={12} color={ok ? C.success : C.danger} />
          <Text style={[styles.statusText, { color: ok ? C.success : C.danger }]}>{ok ? "In range" : "Out of range"}</Text>
        </View>
      ) : null}
    </View>
  );
}

function SmallField({ label, value, setValue, testID }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput testID={testID} style={styles.input} value={value} onChangeText={setValue}
        keyboardType="decimal-pad" placeholder="–" placeholderTextColor={C.textMuted} />
    </View>
  );
}

function Toggle({ label, value, onChange, testID }: any) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)} testID={testID}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.toggleDot, value && styles.toggleDotOn]} />
      </View>
    </TouchableOpacity>
  );
}

function LevelRow({ label, value, onChange }: any) {
  const opts = ["low", "medium", "high"];
  return (
    <View style={styles.levelRow}>
      <Text style={styles.levelLabel}>{label}</Text>
      <View style={styles.levelOpts}>
        {opts.map((o) => (
          <TouchableOpacity
            key={o}
            style={[styles.levelChip, value === o && styles.levelChipActive,
              value === o && o === "low" && { backgroundColor: C.danger },
              value === o && o === "medium" && { backgroundColor: C.warning },
              value === o && o === "high" && { backgroundColor: C.success },
            ]}
            onPress={() => onChange(o)}
            testID={`${label}-${o}`}
          >
            <Text style={[styles.levelText, value === o && { color: "#fff" }]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: "700", color: C.text },
  section: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.md, marginBottom: S.sm },
  field: { marginBottom: S.md },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: C.text2, marginBottom: 6 },
  row: { flexDirection: "row", gap: 8 },
  row2: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: C.text },
  inputBad: { borderColor: C.danger, backgroundColor: "#FFF6F5" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 6 },
  statusText: { fontSize: 11, fontWeight: "700" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  toggleLabel: { fontSize: 14, color: C.text, fontWeight: "500" },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: C.bg3, padding: 2 },
  toggleOn: { backgroundColor: C.brand },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleDotOn: { transform: [{ translateX: 18 }] },
  levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  levelLabel: { fontSize: 14, color: C.text, fontWeight: "500" },
  levelOpts: { flexDirection: "row", gap: 6 },
  levelChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.bg2 },
  levelChipActive: {},
  levelText: { fontSize: 11, fontWeight: "700", color: C.text, textTransform: "uppercase" },
  notes: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 14, color: C.text, marginBottom: 10, minHeight: 50 },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: S.lg },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
