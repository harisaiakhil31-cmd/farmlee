import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ImageBackground,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";
import { confirmAction, notify } from "../../src/confirm";

const STAGE_COLORS: any = {
  seedling: "#A5C45A",
  vegetative: "#4A5D23",
  flowering: "#CC7753",
  fruiting: "#A35327",
  harvest: "#1B2E1C",
};

export default function CropsTab() {
  const router = useRouter();
  const [crops, setCrops] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/crops");
      setCrops(r.data);
    } catch (err) {
      console.error("Crops load failed:", err);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = (id: string, name: string) =>
    confirmAction(
      `Delete "${name}"?`,
      "This crop will be moved to Trash. You can restore it from Profile → Trash within 30 days.",
      async () => {
        try {
          await api.delete(`/crops/${id}`);
          notify("Moved to Trash", `${name} is now in Trash`);
          load();
        } catch (e: any) {
          notify("Failed", e?.response?.data?.detail || "Try again");
        }
      }
    );

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} testID="crops-scroll">
        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1631401551847-78450ef649d8?crop=entropy&cs=srgb&fm=jpg&w=900&q=70" }}
          style={styles.banner}
          imageStyle={{ borderRadius: 24 }}
        >
          <View style={styles.bannerOverlay} />
          <Text style={styles.bannerLabel}>CROPS LIBRARY</Text>
          <Text style={styles.bannerTitle}>Plant playbook</Text>
          <Text style={styles.bannerSub}>Target pH, EC, temp & humidity by stage</Text>
        </ImageBackground>

        <View style={styles.headRow}>
          <Text style={styles.count}>{crops.length} crops</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/crop-edit")}
            testID="crops-add-btn"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addText}>Add crop</Text>
          </TouchableOpacity>
        </View>

        {crops.map((c) => (
          <View key={c.id} style={styles.cropCard} testID={`crop-${c.id}`}>
            <TouchableOpacity
              style={styles.cropHead}
              onPress={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              <View style={styles.leaf}><Ionicons name="leaf" size={20} color={C.brand} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cropName}>{c.name}</Text>
                <Text style={styles.cropDesc} numberOfLines={1}>{c.description}</Text>
              </View>
              <Ionicons
                name={expanded === c.id ? "chevron-up" : "chevron-down"}
                size={20}
                color={C.text2}
              />
            </TouchableOpacity>

            {expanded === c.id && (
              <View style={styles.stagesWrap}>
                {(c.stages || []).map((s: any, i: number) => (
                  <View key={`${c.id}-stage-${s.name}-${i}`} style={styles.stage}>
                    <View style={[styles.stageBar, { backgroundColor: STAGE_COLORS[s.name] || C.brand }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.stageHead}>
                        <Text style={styles.stageName}>{s.name.toUpperCase()}</Text>
                        <Text style={styles.stageDuration}>{s.duration_days}d</Text>
                      </View>
                      <View style={styles.stageGrid}>
                        <Param label="pH" min={s.ph_min} max={s.ph_max} />
                        <Param label="EC" min={s.ec_min} max={s.ec_max} />
                        <Param label="Temp °C" min={s.temp_min} max={s.temp_max} />
                        <Param label="Hum %" min={s.humidity_min} max={s.humidity_max} />
                      </View>
                      {s.notes ? <Text style={styles.stageNote}>{s.notes}</Text> : null}
                    </View>
                  </View>
                ))}
                <View style={styles.cropActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push({ pathname: "/crop-edit", params: { id: c.id } })}
                  >
                    <Ionicons name="create-outline" size={16} color={C.text} />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => onDelete(c.id)}>
                    <Ionicons name="trash-outline" size={16} color={C.danger} />
                    <Text style={styles.delText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Param({ label, min, max }: any) {
  return (
    <View style={styles.param}>
      <Text style={styles.paramLabel}>{label}</Text>
      <Text style={styles.paramRange}>{min} – {max}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.md },
  banner: { height: 160, marginTop: S.sm, marginBottom: S.md, overflow: "hidden", justifyContent: "flex-end", padding: S.md },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(27,46,28,0.5)", borderRadius: 24 },
  bannerLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: "#D6DBC4" },
  bannerTitle: { fontSize: 28, fontWeight: "800", color: "#fff", marginTop: 4 },
  bannerSub: { fontSize: 13, color: "#E6E9D6", marginTop: 2 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.md },
  count: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.brand, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  addText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  cropCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 10, overflow: "hidden" },
  cropHead: { flexDirection: "row", alignItems: "center", gap: 12, padding: S.md },
  leaf: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EFF3DC", alignItems: "center", justifyContent: "center" },
  cropName: { fontSize: 17, fontWeight: "700", color: C.text },
  cropDesc: { fontSize: 12, color: C.text2, marginTop: 2 },
  stagesWrap: { borderTopWidth: 1, borderTopColor: C.border, padding: S.md, gap: 12 },
  stage: { flexDirection: "row", gap: 12 },
  stageBar: { width: 4, borderRadius: 2 },
  stageHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stageName: { fontSize: 11, fontWeight: "800", color: C.text, letterSpacing: 1.5 },
  stageDuration: { fontSize: 11, fontWeight: "600", color: C.accent },
  stageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  param: { backgroundColor: C.bg2, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  paramLabel: { fontSize: 9, fontWeight: "700", color: C.text2, letterSpacing: 1 },
  paramRange: { fontSize: 12, fontWeight: "600", color: C.text, marginTop: 1 },
  stageNote: { fontSize: 12, color: C.textMuted, fontStyle: "italic", marginTop: 6 },
  cropActions: { flexDirection: "row", gap: 8, marginTop: S.sm },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.bg2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  editText: { fontSize: 12, fontWeight: "600", color: C.text },
  delBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FCE4E1", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  delText: { fontSize: 12, fontWeight: "600", color: C.danger },
});
