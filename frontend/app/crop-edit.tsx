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

  useEffect(() => {
    if (id) {
      (async () => {
        const r = await api.get("/crops");
        const found = r.data.find((c: any) => c.id === id);
        if (found) {
          setName(found.name); setDesc(found.description || "");
          setStages(found.stages || [emptyStage()]);
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
          duration_days: parseInt(s.duration_days),
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
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={styles.title}>{id ? "Edit crop" : "New crop"}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>NAME</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Spinach" placeholderTextColor={C.textMuted} testID="crop-name" />
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput style={[styles.input, { minHeight: 60 }]} value={desc} onChangeText={setDesc} placeholder="Optional" placeholderTextColor={C.textMuted} multiline />

          <View style={styles.stageHead}>
            <Text style={styles.label}>STAGES</Text>
            <TouchableOpacity style={styles.addStage} onPress={() => setStages([...stages, emptyStage()])} testID="add-stage">
              <Ionicons name="add" size={14} color={C.brand} />
              <Text style={styles.addStageText}>Add stage</Text>
            </TouchableOpacity>
          </View>

          {stages.map((s, i) => (
            <View key={`stage-${i}-${s.name}`} style={styles.stage}>
              <View style={styles.stageRow}>
                <TextInput style={[styles.input, { flex: 1 }]} value={s.name} onChangeText={(v) => setStage(i, "name", v)}
                  placeholder="seedling | vegetative | flowering | fruiting | harvest" placeholderTextColor={C.textMuted} />
                {stages.length > 1 && (
                  <TouchableOpacity onPress={() => setStages(stages.filter((_, j) => j !== i))} style={styles.delStage}>
                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.gridRow}>
                <Mini label="pH min" value={String(s.ph_min)} setValue={(v) => setStage(i, "ph_min", v)} />
                <Mini label="pH max" value={String(s.ph_max)} setValue={(v) => setStage(i, "ph_max", v)} />
                <Mini label="EC min" value={String(s.ec_min)} setValue={(v) => setStage(i, "ec_min", v)} />
                <Mini label="EC max" value={String(s.ec_max)} setValue={(v) => setStage(i, "ec_max", v)} />
              </View>
              <View style={styles.gridRow}>
                <Mini label="T min" value={String(s.temp_min)} setValue={(v) => setStage(i, "temp_min", v)} />
                <Mini label="T max" value={String(s.temp_max)} setValue={(v) => setStage(i, "temp_max", v)} />
                <Mini label="H min" value={String(s.humidity_min)} setValue={(v) => setStage(i, "humidity_min", v)} />
                <Mini label="H max" value={String(s.humidity_max)} setValue={(v) => setStage(i, "humidity_max", v)} />
              </View>
              <Mini label="Duration (days)" value={String(s.duration_days)} setValue={(v) => setStage(i, "duration_days", v)} wide />
              <TextInput style={[styles.input, { marginTop: 8 }]} value={s.notes} onChangeText={(v) => setStage(i, "notes", v)}
                placeholder="Notes (optional)" placeholderTextColor={C.textMuted} />
            </View>
          ))}

          <TouchableOpacity style={styles.save} onPress={save} disabled={loading} testID="crop-save">
            <Text style={styles.saveText}>{loading ? "Saving..." : "Save crop"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Mini({ label, value, setValue, wide }: any) {
  return (
    <View style={{ flex: wide ? 1 : 0, width: wide ? "100%" : "23%" }}>
      <Text style={styles.miniLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholderTextColor={C.textMuted} />
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
  stage: { backgroundColor: C.card, borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  stageRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  delStage: { width: 38, height: 38, backgroundColor: "#FCE4E1", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  gridRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  miniLabel: { fontSize: 9, fontWeight: "700", color: C.text2, letterSpacing: 1, marginBottom: 3 },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: S.lg },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
