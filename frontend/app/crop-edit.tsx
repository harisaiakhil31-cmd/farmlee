import { useEffect, useState, useCallback, memo } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { C, S } from "../src/theme";

// Generate a stable client-side ID for each stage so keys never change while editing
const newStageId = () => `s_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;

const emptyStage = () => ({
  _uid: newStageId(),
  name: "", ph_min: "", ph_max: "", ec_min: "", ec_max: "",
  temp_min: "", temp_max: "", humidity_min: "", humidity_max: "", duration_days: "", notes: "",
});

export default function CropEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [stages, setStages] = useState<any[]>([]);   // ← starts truly empty
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
            // Ensure each loaded stage has a stable _uid for the React key
            setStages((found.stages || []).map((st: any) => ({ ...st, _uid: st._uid || newStageId() })));
            setLoadedFromServer(true);
          }
        } catch (err) {
          console.error("Crop load failed:", err);
        }
      })();
    }
  }, [id]);

  // Stable callbacks via useCallback so memoized child components don't re-render unnecessarily
  const updateField = useCallback((uid: string, field: string, val: any) => {
    setStages((prev) => prev.map((s) => (s._uid === uid ? { ...s, [field]: val } : s)));
  }, []);

  const removeStage = useCallback((uid: string) => {
    setStages((prev) => prev.filter((s) => s._uid !== uid));
  }, []);

  const addStage = useCallback(() => {
    setStages((prev) => [...prev, emptyStage()]);
  }, []);

  const save = async () => {
    if (!name.trim()) return Alert.alert("Required", "Enter crop name");
    if (stages.length === 0) return Alert.alert("Required", "Add at least one stage. Tap + Add stage above.");
    const numericKeys = ["ph_min", "ph_max", "ec_min", "ec_max", "temp_min", "temp_max", "humidity_min", "humidity_max", "duration_days"];
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      if (!s.name?.trim()) return Alert.alert("Required", `Stage ${i + 1}: enter a stage name`);
      for (const k of numericKeys) {
        if (s[k] === "" || s[k] === null || s[k] === undefined || isNaN(parseFloat(s[k]))) {
          return Alert.alert("Required", `Stage ${i + 1} ("${s.name}"): fill in ${k.replace("_", " ")}`);
        }
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: desc.trim(),
        stages: stages.map((s) => ({
          name: s.name.trim(),
          ph_min: parseFloat(s.ph_min), ph_max: parseFloat(s.ph_max),
          ec_min: parseFloat(s.ec_min), ec_max: parseFloat(s.ec_max),
          temp_min: parseFloat(s.temp_min), temp_max: parseFloat(s.temp_max),
          humidity_min: parseFloat(s.humidity_min), humidity_max: parseFloat(s.humidity_max),
          duration_days: parseInt(s.duration_days, 10),
          notes: s.notes || "",
        })),
      };
      if (id) await api.put(`/crops/${id}`, payload);
      else await api.post("/crops", payload);
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
            <TouchableOpacity style={styles.addStage} onPress={addStage} testID="add-stage">
              <Ionicons name="add" size={14} color={C.brand} />
              <Text style={styles.addStageText}>Add stage</Text>
            </TouchableOpacity>
          </View>

          {stages.length === 0 && (
            <View style={styles.emptyStages}>
              <Ionicons name="add-circle-outline" size={32} color={C.textMuted} />
              <Text style={styles.emptyStagesText}>
                No stages yet. Tap <Text style={{ fontWeight: "800", color: C.brand }}>+ Add stage</Text> above to define your first growth stage.
              </Text>
            </View>
          )}

          {stages.map((s, i) => (
            <StageBlock
              key={s._uid}                                    /* ← stable key, never changes */
              stage={s}
              index={i}
              isLoadedExisting={!!id && loadedFromServer}
              canDelete={stages.length > 1}
              onUpdate={updateField}
              onRemove={removeStage}
            />
          ))}

          <TouchableOpacity style={styles.save} onPress={save} disabled={loading} testID="crop-save">
            <Text style={styles.saveText}>{loading ? "Saving..." : id ? "Update crop" : "Save crop"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Each stage block is its own memoized component.
 * Memo ensures it only re-renders when its own `stage` prop changes (i.e. user is typing in THIS stage),
 * so typing in stage A doesn't re-render stage B, preserving focus reliably.
 */
const StageBlock = memo(function StageBlock({
  stage, index, isLoadedExisting, canDelete, onUpdate, onRemove,
}: any) {
  const set = (field: string, val: any) => onUpdate(stage._uid, field, val);

  return (
    <View style={styles.stage}>
      {/* Stage name + delete */}
      <View style={styles.stageRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={stage.name}
          onChangeText={(v) => set("name", v)}
          placeholder="e.g. Seedling, Vegetative, Flowering..."
          placeholderTextColor={C.textMuted}
          testID={`stage-${index}-name`}
        />
        {canDelete && (
          <TouchableOpacity
            onPress={() => onRemove(stage._uid)}
            style={styles.delStage}
            testID={`stage-${index}-delete`}
          >
            <Ionicons name="trash-outline" size={18} color={C.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* "Saved values" summary card — visible only when editing an existing crop with non-empty values */}
      {isLoadedExisting && stage.ph_min !== "" && (
        <View style={styles.summary} testID={`stage-${index}-summary`}>
          <View style={styles.summaryHead}>
            <Ionicons name="bookmark" size={12} color={C.brand} />
            <Text style={styles.summaryTitle}>SAVED VALUES</Text>
          </View>
          <View style={styles.summaryGrid}>
            <Text style={styles.summaryItem}>pH <Text style={styles.summaryNum}>{stage.ph_min}–{stage.ph_max}</Text></Text>
            <Text style={styles.summaryItem}>EC <Text style={styles.summaryNum}>{stage.ec_min}–{stage.ec_max}</Text></Text>
            <Text style={styles.summaryItem}>Temp <Text style={styles.summaryNum}>{stage.temp_min}–{stage.temp_max}°C</Text></Text>
            <Text style={styles.summaryItem}>Humidity <Text style={styles.summaryNum}>{stage.humidity_min}–{stage.humidity_max}%</Text></Text>
            <Text style={styles.summaryItem}>Duration <Text style={styles.summaryNum}>{stage.duration_days} days</Text></Text>
          </View>
        </View>
      )}

      <PairRow
        label="pH range" minLabel="Min" maxLabel="Max"
        minVal={String(stage.ph_min)} maxVal={String(stage.ph_max)}
        onMin={(v: string) => set("ph_min", v)} onMax={(v: string) => set("ph_max", v)}
        minPh="5.5" maxPh="6.5" tid={`stage-${index}-ph`}
      />
      <PairRow
        label="EC (mS/cm)" minLabel="Min" maxLabel="Max"
        minVal={String(stage.ec_min)} maxVal={String(stage.ec_max)}
        onMin={(v: string) => set("ec_min", v)} onMax={(v: string) => set("ec_max", v)}
        minPh="0.8" maxPh="1.5" tid={`stage-${index}-ec`}
      />
      <PairRow
        label="Temperature (°C)" minLabel="Min" maxLabel="Max"
        minVal={String(stage.temp_min)} maxVal={String(stage.temp_max)}
        onMin={(v: string) => set("temp_min", v)} onMax={(v: string) => set("temp_max", v)}
        minPh="18" maxPh="25" tid={`stage-${index}-temp`}
      />
      <PairRow
        label="Humidity (%)" minLabel="Min" maxLabel="Max"
        minVal={String(stage.humidity_min)} maxVal={String(stage.humidity_max)}
        onMin={(v: string) => set("humidity_min", v)} onMax={(v: string) => set("humidity_max", v)}
        minPh="50" maxPh="75" tid={`stage-${index}-humidity`}
      />

      <View style={styles.pairWrap}>
        <Text style={styles.pairLabel}>Duration (days)</Text>
        <TextInput
          style={[styles.input, { width: "100%" }]}
          value={String(stage.duration_days ?? "")}
          onChangeText={(v) => set("duration_days", v)}
          keyboardType="number-pad"
          placeholder="14"
          placeholderTextColor={C.textMuted}
          testID={`stage-${index}-duration`}
        />
      </View>

      <View style={styles.pairWrap}>
        <Text style={styles.pairLabel}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, { width: "100%" }]}
          value={stage.notes || ""}
          onChangeText={(v) => set("notes", v)}
          placeholder="Notes for this stage"
          placeholderTextColor={C.textMuted}
        />
      </View>
    </View>
  );
});

const PairRow = memo(function PairRow({ label, minLabel, maxLabel, minVal, maxVal, onMin, onMax, tid, minPh, maxPh }: any) {
  return (
    <View style={styles.pairWrap}>
      <Text style={styles.pairLabel}>{label}</Text>
      <View style={styles.pairInputs}>
        <View style={styles.pairCol}>
          <Text style={styles.pairColLabel}>{minLabel}</Text>
          <TextInput
            style={styles.pairInput}
            value={minVal === "undefined" ? "" : minVal}
            onChangeText={onMin}
            keyboardType="decimal-pad"
            placeholder={minPh}
            placeholderTextColor={C.textMuted}
            testID={`${tid}-min`}
          />
        </View>
        <Text style={styles.dash}>—</Text>
        <View style={styles.pairCol}>
          <Text style={styles.pairColLabel}>{maxLabel}</Text>
          <TextInput
            style={styles.pairInput}
            value={maxVal === "undefined" ? "" : maxVal}
            onChangeText={onMax}
            keyboardType="decimal-pad"
            placeholder={maxPh}
            placeholderTextColor={C.textMuted}
            testID={`${tid}-max`}
          />
        </View>
      </View>
    </View>
  );
});

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

  summary: { marginTop: 12, padding: 12, backgroundColor: "#EFF3DC", borderWidth: 1, borderColor: "#D9DFB8", borderRadius: 12 },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  summaryTitle: { fontSize: 10, fontWeight: "800", color: C.brand, letterSpacing: 2 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, rowGap: 4 },
  summaryItem: { fontSize: 12, color: C.text2 },
  summaryNum: { fontSize: 13, fontWeight: "800", color: C.text },

  pairWrap: { marginTop: 12 },
  pairLabel: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 1.4, marginBottom: 6 },
  pairInputs: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  pairCol: { flex: 1 },
  pairColLabel: { fontSize: 9, fontWeight: "700", color: C.textMuted, letterSpacing: 0.8, marginBottom: 3 },
  pairInput: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, fontSize: 14, color: C.text, textAlign: "center" },
  dash: { fontSize: 18, color: C.textMuted, paddingBottom: 8, fontWeight: "700" },

  emptyStages: { alignItems: "center", padding: 20, gap: 8, marginTop: 10, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, borderStyle: "dashed" },
  emptyStagesText: { fontSize: 13, color: C.text2, textAlign: "center", lineHeight: 19 },

  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: S.lg, marginBottom: 30 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
