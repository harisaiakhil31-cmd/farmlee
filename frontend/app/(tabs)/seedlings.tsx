import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, differenceInDays, parseISO } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";

type Batch = {
  id: string; batch_name: string; seedling_type_id: string; seedling_type_name: string;
  quantity: number; sown_date: string; expected_transplant_date?: string;
  actual_transplant_date?: string; status: string; tray_location?: string;
  progress?: {
    current_stage?: { stage_name?: string; ec_min?: number; ec_max?: number; duration_days?: number };
    current_stage_index?: number;
    day_in_stage?: number;
    days_since_sown?: number;
    ready_to_transplant?: boolean;
  };
};

export default function SeedlingsScreen() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [typesCount, setTypesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, t] = await Promise.all([
        api.get("/seedlings/batches"),
        api.get("/seedlings/types"),
      ]);
      setBatches(b.data || []);
      setTypesCount((t.data || []).length);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const active = batches.filter(b => b.status === "active");
  const past = batches.filter(b => b.status !== "active");

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <View>
          <Text style={s.title}>Seedlings</Text>
          <Text style={s.subtitle}>{active.length} active · {typesCount} plant types</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/seedling-types")} testID="seedling-types-btn">
          <Ionicons name="settings-outline" size={24} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: S.md, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {loading ? <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} /> : (
          <>
            {active.length === 0 && past.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="flower-outline" size={48} color={C.text2} />
                <Text style={s.emptyT}>No seedling batches yet</Text>
                <Text style={s.emptyS}>Tap + below to plant your first batch</Text>
              </View>
            ) : (
              <>
                {active.length > 0 && <Text style={s.section}>ACTIVE BATCHES</Text>}
                {active.map(b => <BatchCard key={b.id} b={b} onPress={() => router.push({ pathname: "/seedling-batch", params: { id: b.id } })} />)}

                {past.length > 0 && <Text style={[s.section, { marginTop: S.lg }]}>PAST BATCHES</Text>}
                {past.map(b => <BatchCard key={b.id} b={b} onPress={() => router.push({ pathname: "/seedling-batch", params: { id: b.id } })} />)}
              </>
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => router.push("/seedling-new")} testID="new-batch-btn">
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function BatchCard({ b, onPress }: { b: Batch; onPress: () => void }) {
  const p = b.progress || {};
  const stage = p.current_stage;
  const isActive = b.status === "active";
  let daysLeft = 0;
  if (b.expected_transplant_date) {
    try { daysLeft = differenceInDays(parseISO(b.expected_transplant_date), new Date()); } catch {}
  }
  return (
    <TouchableOpacity style={s.card} onPress={onPress}>
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.batch}>{b.batch_name}</Text>
          <Text style={s.type}>{b.seedling_type_name} · {b.quantity} plants</Text>
        </View>
        {isActive ? (
          p.ready_to_transplant ? <Pill text="Ready!" color="#A5C45A" /> :
            <Pill text={`${daysLeft >= 0 ? daysLeft : 0}d left`} color="#CC7753" />
        ) : <Pill text="Transplanted" color={C.text2} />}
      </View>

      {isActive && stage && (
        <View style={s.stageRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.stageName}>{stage.stage_name}</Text>
            <Text style={s.stageMeta}>Day {p.day_in_stage} of {stage.duration_days} · EC {stage.ec_min}–{stage.ec_max}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.text2} />
        </View>
      )}

      <View style={s.meta}>
        <Text style={s.metaT}>Sown {format(parseISO(b.sown_date), "MMM d")}</Text>
        {b.actual_transplant_date && <Text style={s.metaT}>· TX {format(parseISO(b.actual_transplant_date), "MMM d")}</Text>}
        {b.tray_location ? <Text style={s.metaT}>· {b.tray_location}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function Pill({ text, color }: { text: string; color: string }) {
  return <View style={[s.pill, { backgroundColor: color + "22", borderColor: color }]}><Text style={[s.pillT, { color }]}>{text}</Text></View>;
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: S.md, paddingBottom: S.sm },
  title: { fontSize: 28, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: C.text2, marginTop: 2 },
  section: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginBottom: S.sm },

  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyT: { fontSize: 17, fontWeight: "700", color: C.text, marginTop: 12 },
  emptyS: { fontSize: 13, color: C.text2 },

  card: { backgroundColor: C.card, borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  batch: { fontSize: 17, fontWeight: "800", color: C.text },
  type: { fontSize: 12, color: C.text2, marginTop: 2, fontWeight: "600" },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  pillT: { fontSize: 11, fontWeight: "700" },

  stageRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.bg2, borderRadius: 10, padding: 10, marginTop: 10 },
  stageName: { fontSize: 14, fontWeight: "700", color: C.text },
  stageMeta: { fontSize: 11, color: C.text2, marginTop: 2 },

  meta: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  metaT: { fontSize: 11, color: C.text2, fontWeight: "600" },

  fab: { position: "absolute", right: S.md, bottom: 28, width: 56, height: 56, borderRadius: 28, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
});
