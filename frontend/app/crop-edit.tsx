import { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { C, S } from "../src/theme";

const emptyStage = () => ({
  name: "seedling", ph_min: 5.5, ph_max: 6.5, ec_min: 0.8, ec_max: 1.5,
  temp_min: 18, temp_max: 25, humidity_min: 50, humidity_max: 75, duration_days: 14, notes: "",
});

export default function CropEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [stages, setStages] = useState<any[]>([emptyStage()]);
  const [loading, setLoading] = useState(false);
  const [loadedFromServer, setLoadedFromServer] = useState(false);

  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const r = await api.get("/crops");
          const found = r.data.find((c: any) => c.id === id);
          if (found) {
            setName(found.name);
            setDesc(found.description || "");
            setStages(found.stages || [emptyStage()]);
            setLoadedFromServer(true);
          }
        } catch (err) {
          console.error("Crop load failed:", err);
        }
      })();
    }
  }, [id]);

  const setStage = (i: number, field: string, val: any) => {
    const next = [...stages]; next[i] = { ...next[i], [field]: val }; setStages(next);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert("Required", "Enter crop name");
    setLoading(true);
    try {
      const payload = {
        name: name.trim(), description: desc.trim(),
        stages: stages.map((s) => ({
          ...s,
          ph_min: parseFloat(s.ph_min), ph_max: parseFloat(s.ph_max),
          ec_min: parseFloat(s.ec_min), ec_max: parseFloat(s.ec_max),
          temp_min: parseFloat(s.temp_min), temp_max: parseFloat(s.temp_max),
          humidity_min: parseFloat(s.humidity_min), humidity_max: parseFloat(s.humidity_max),
          duration_days: parseInt(s.duration_days, 10),
        })),
      };
      if (id) await api.put(`/crops/${id}`, payload); else await api.post("/crops", payload);
      router.back();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()} testID="crop-back">
          <Ionicons name="close" size={26} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{id ? "Edit crop" : "New crop"}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Spinach"
            placeholderTextColor={C.textMuted}
            testID="crop-name"
          />
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            value={desc}
            onChangeText={setDesc}
            placeholder="Optional"
            placeholderTextColor={C.textMuted}
            multiline
          />

          <View style={styles.stageHead}>
            <Text style={styles.label}>STAGES</Text>
            <TouchableOpacity
              style={styles.addStage}
              onPress={() => setStages([...stages, emptyStage()])}
              testID="add-stage"
            >
              <Ionicons name="add" size={14} color={C.brand} />
              <Text style={styles.addStageText}>Add stage</Text>
            </TouchableOpacity>
          </View>

          {stages.map((s, i) => (
            <View key={`stage-${i}-${s.name}`} style={styles.stage}>
              {/* Stage name + delete */}
              <View style={styles.stageRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={s.name}
                  onChangeText={(v) => setStage(i, "name", v)}
                  placeholder="seedling | vegetative | flowering | fruiting | harvest"
                  placeholderTextColor={C.textMuted}
                  testID={`stage-${i}-name`}
                />
                {stages.length > 1 && (
                  <TouchableOpacity
                    onPress={() => setStages(stages.filter((_, j) => j !== i))}
                    style={styles.delStage}
                    testID={`stage-${i}-delete`}
                  >
                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Currently saved values summary (shown when editing existing crop) */}
              {id && loadedFromServer && (
                <View style={styles.summary} testID={`stage-${i}-summary`}>
                  <View style={styles.summaryHead}>
                    <Ionicons name="bookmark" size={12} color={C.brand} />
                    <Text style={styles.summaryTitle}>SAVED VALUES</Text>
                  </View>
                  <View style={styles.summaryGrid}>
                    <Text style={styles.summaryItem}>pH <Text style={styles.summaryNum}>{s.ph_min}–{s.ph_max}</Text></Text>
                    <Text style={styles.summaryItem}>EC <Text style={styles.summaryNum}>{s.ec_min}–{s.ec_max}</Text></Text>
                    <Text style={styles.summaryItem}>Temp <Text style={styles.summaryNum}>{s.temp_min}–{s.temp_max}°C</Text></Text>
                    <Text style={styles.summaryItem}>Humidity <Text style={styles.summaryNum}>{s.humidity_min}–{s.humidity_max}%</Text></Text>
                    <Text style={styles.summaryItem}>Duration <Text style={styles.summaryNum}>{s.duration_days} days</Text></Text>
                  </View>
                </View>
              )}

              {/* Horizontal min–max pair rows */}
              <PairRow
                label="pH range"
                minLabel="Min"
                maxLabel="Max"
                minVal={String(s.ph_min)}
                maxVal={String(s.ph_max)}
                onMin={(v) => setStage(i, "ph_min", v)}
                onMax={(v) => setStage(i, "ph_max", v)}
                tid={`stage-${i}-ph`}
              />
              <PairRow
                label="EC (mS/cm)"
                minLabel="Min"
                maxLabel="Max"
                minVal={String(s.ec_min)}
                maxVal={String(s.ec_max)}
                onMin={(v) => setStage(i, "ec_min", v)}
                onMax={(v) => setStage(i, "ec_max", v)}
                tid={`stage-${i}-ec`}
              />
              <PairRow
                label="Temperature (°C)"
                minLabel="Min"
                maxLabel="Max"
                minVal={String(s.temp_min)}
                maxVal={String(s.temp_max)}
                onMin={(v) => setStage(i, "temp_min", v)}
                onMax={(v) => setStage(i, "temp_max", v)}
                tid={`stage-${i}-temp`}
              />
              <PairRow
                label="Humidity (%)"
                minLabel="Min"
                maxLabel="Max"
                minVal={String(s.humidity_min)}
                maxVal={String(s.humidity_max)}
                onMin={(v) => setStage(i, "humidity_min", v)}
                onMax={(v) => setStage(i, "humidity_max", v)}
                tid={`stage-${i}-humidity`}
              />

              {/* Duration on its own */}
              <View style={styles.pairWrap}>
                <Text style={styles.pairLabel}>Duration (days)</Text>
                <TextInput
                  style={[styles.input, { width: "100%" }]}
                  value={String(s.duration_days)}
                  onChangeText={(v) => setStage(i, "duration_days", v)}
                  keyboardType="number-pad"
                  placeholderTextColor={C.textMuted}
                  testID={`stage-${i}-duration`}
                />
              </View>

              <View style={styles.pairWrap}>
                <Text style={styles.pairLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, { width: "100%" }]}
                  value={s.notes}
                  onChangeText={(v) => setStage(i, "notes", v)}
                  placeholder="Notes for this stage"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.save} onPress={save} disabled={loading} testID="crop-save">
            <Text style={styles.saveText}>{loading ? "Saving..." : id ? "Update crop" : "Save crop"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PairRow({ label, minLabel, maxLabel, minVal, maxVal, onMin, onMax, tid }: any) {
  return (
    <View style={styles.pairWrap}>
      <Text style={styles.pairLabel}>{label}</Text>
      <View style={styles.pairInputs}>
        <View style={styles.pairCol}>
          <Text style={styles.pairColLabel}>{minLabel}</Text>
          <TextInput
            style={styles.pairInput}
            value={minVal}
            onChangeText={onMin}
            keyboardType="decimal-pad"
            placeholderTextColor={C.textMuted}
            testID={`${tid}-min`}
          />
        </View>
        <Text style={styles.dash}>—</Text>
        <View style={styles.pairCol}>
          <Text style={styles.pairColLabel}>{maxLabel}</Text>
          <TextInput
            style={styles.pairInput}
            value={maxVal}
            onChangeText={onMax}
            keyboardType="decimal-pad"
            placeholderTextColor={C.textMuted}
            testID={`${tid}-max`}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: "700", color: C.text },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.md, marginBottom: 6 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, fontSize: 14, color: C.text },

  stageHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addStage: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EFF3DC", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: S.md },
  addStageText: { color: C.brand, fontWeight: "700", fontSize: 12 },

  stage: { backgroundColor: C.card, borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  stageRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  delStage: { width: 38, height: 38, backgroundColor: "#FCE4E1", borderRadius: 10, alignItems: "center", justifyContent: "center" },

  // SAVED VALUES summary card
  summary: { marginTop: 12, padding: 12, backgroundColor: "#EFF3DC", borderWidth: 1, borderColor: "#D9DFB8", borderRadius: 12 },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  summaryTitle: { fontSize: 10, fontWeight: "800", color: C.brand, letterSpacing: 2 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, rowGap: 4 },
  summaryItem: { fontSize: 12, color: C.text2 },
  summaryNum: { fontSize: 13, fontWeight: "800", color: C.text },

  // Horizontal min–max pair rows
  pairWrap: { marginTop: 12 },
  pairLabel: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 1.4, marginBottom: 6 },
  pairInputs: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  pairCol: { flex: 1 },
  pairColLabel: { fontSize: 9, fontWeight: "700", color: C.textMuted, letterSpacing: 0.8, marginBottom: 3 },
  pairInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, fontSize: 14, color: C.text, textAlign: "center" },
  dash: { fontSize: 18, color: C.textMuted, paddingBottom: 8, fontWeight: "700" },

  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: S.lg, marginBottom: 30 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
