import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../src/api";
import { C, S } from "../src/theme";
import { confirmAction, notify } from "../src/confirm";

const COLLECTION_LABEL: Record<string, { label: string; icon: any }> = {
  crops: { label: "Crop", icon: "leaf" },
  tank_readings: { label: "Tank reading", icon: "water" },
  environment_readings: { label: "Environment", icon: "thermometer" },
  field_tasks: { label: "Field task", icon: "construct" },
  weekly_checks: { label: "Weekly check", icon: "calendar" },
  monthly_checks: { label: "Monthly check", icon: "calendar-clear" },
  reminders: { label: "Reminder", icon: "alarm" },
  seedling_types: { label: "Seedling type", icon: "flower" },
  seedling_batches: { label: "Seedling batch", icon: "leaf-outline" },
  inventory: { label: "Inventory item", icon: "cube" },
  task_templates: { label: "Task template", icon: "list" },
};

function summarize(item: any, coll: string): string {
  if (!item) return "(empty)";
  if (coll === "crops") return item.name || "(crop)";
  if (coll === "tank_readings") return `Tank ${item.tank_id} · ${item.session?.toUpperCase()} · pH ${item.ph_actual} · EC ${item.ec_actual}`;
  if (coll === "environment_readings") return `${item.session?.toUpperCase()} · ${item.temperature}°C · ${item.humidity}%`;
  if (coll === "field_tasks") return `Field tasks · ${item.check_date || ""}`;
  if (coll === "weekly_checks") return `Weekly · ${item.check_date || ""}`;
  if (coll === "monthly_checks") return `Monthly · ${item.check_date || ""}`;
  if (coll === "reminders") return item.title || "(reminder)";
  if (coll === "seedling_types") return item.name || "(seedling type)";
  if (coll === "seedling_batches") return `Batch ${item.batch_code || item.id}`;
  if (coll === "inventory") return `${item.name} · ${item.quantity ?? "?"} ${item.unit ?? ""}`;
  if (coll === "task_templates") return item.name || "(task)";
  return item.name || item.title || item.id || "(item)";
}

export default function TrashScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/trash");
      setItems(r.data.items || []);
      setCounts(r.data.counts || {});
    } catch (err) {
      console.error("Trash load failed:", err);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRestore = (t: any) => {
    setBusyId(t.id);
    api.post(`/trash/${t.id}/restore`).then(() => {
      notify("Restored", "Item moved back to its original section");
      load();
    }).catch((e) => {
      notify("Failed", e?.response?.data?.detail || "Try again");
    }).finally(() => setBusyId(null));
  };

  const onPurge = (t: any) => confirmAction(
    "Permanently delete?",
    "This cannot be undone.",
    async () => {
      setBusyId(t.id);
      try {
        await api.delete(`/trash/${t.id}`);
        load();
      } catch (e: any) {
        notify("Failed", e?.response?.data?.detail || "Try again");
      } finally { setBusyId(null); }
    }
  );

  const visible = filter === "all" ? items : items.filter((x) => x.collection_name === filter);

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} testID="trash-close"><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Trash</Text>
        <TouchableOpacity onPress={load} style={s.iconBtn} testID="trash-refresh"><Ionicons name="refresh" size={20} color={C.text} /></TouchableOpacity>
      </View>
      <Text style={s.sub}>Items here are auto-purged after 30 days. Tap restore to bring back.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: S.md, gap: 8, marginTop: 8, paddingBottom: 6, alignItems: "center" }}>
        <FilterChip label={`ALL (${items.length})`} active={filter === "all"} onPress={() => setFilter("all")} />
        {Object.entries(counts).map(([k, n]) => (
          <FilterChip
            key={k}
            label={`${(COLLECTION_LABEL[k]?.label || k).toUpperCase()} (${n})`}
            active={filter === k}
            onPress={() => setFilter(k)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} />
        ) : visible.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="trash-bin-outline" size={48} color={C.textMuted} />
            <Text style={s.emptyT}>Trash is empty</Text>
            <Text style={s.emptyS}>Deleted items appear here for 30 days.</Text>
          </View>
        ) : visible.map((t) => {
          const meta = COLLECTION_LABEL[t.collection_name] || { label: t.collection_name, icon: "ellipse-outline" };
          let when = "";
          try { when = format(new Date(t.deleted_at), "MMM d, h:mm a"); } catch { /* ignore */ }
          return (
            <View key={t.id} style={s.card} testID={`trash-${t.id}`}>
              <View style={s.cardIcon}><Ionicons name={meta.icon} size={20} color={C.brand} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{summarize(t.item, t.collection_name)}</Text>
                <Text style={s.cardMeta}>
                  {meta.label} · deleted {when} · by {t.deleted_by_name || "?"}
                </Text>
              </View>
              <View style={s.actions}>
                <TouchableOpacity
                  style={[s.btn, s.restoreBtn]}
                  onPress={() => onRestore(t)}
                  disabled={busyId === t.id}
                  testID={`restore-${t.id}`}
                >
                  {busyId === t.id ? <ActivityIndicator size="small" color={C.brand} /> : <Ionicons name="arrow-undo" size={16} color={C.brand} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btn, s.purgeBtn]}
                  onPress={() => onPurge(t)}
                  disabled={busyId === t.id}
                  testID={`purge-${t.id}`}
                >
                  <Ionicons name="close-circle" size={16} color={C.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: any) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipOn]} onPress={onPress}>
      <Text style={[s.chipText, active && { color: "#fff" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  iconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: C.text },
  sub: { fontSize: 12, color: C.text2, paddingHorizontal: S.md, marginTop: 6 },
  empty: { alignItems: "center", padding: 50, gap: 10 },
  emptyT: { fontSize: 16, fontWeight: "700", color: C.text2 },
  emptyS: { fontSize: 12, color: C.textMuted },
  card: { flexDirection: "row", gap: 10, backgroundColor: C.card, borderRadius: 14, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: 10, alignItems: "center" },
  cardIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: "#EFF3DC", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  cardMeta: { fontSize: 11, color: C.textMuted, marginTop: 3 },
  actions: { flexDirection: "row", gap: 6 },
  btn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  restoreBtn: { backgroundColor: "#EFF3DC" },
  purgeBtn: { backgroundColor: "#FCE4E1" },
  chip: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 11, fontWeight: "800", color: C.text, letterSpacing: 1 },
});
