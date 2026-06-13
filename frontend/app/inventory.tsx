import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { C, S } from "../src/theme";
import { confirmAction, notify } from "../src/confirm";

const TYPE_META: Record<string, { label: string; color: string }> = {
  seed: { label: "Seed", color: "#A5C45A" },
  solution_a: { label: "Solution A", color: "#4A5D23" },
  solution_b: { label: "Solution B", color: "#CC7753" },
  solution_c: { label: "Solution C", color: "#A35327" },
  nutrient: { label: "Nutrient", color: "#5B6CB0" },
  fertilizer: { label: "Fertilizer", color: "#B07A4F" },
  other: { label: "Other", color: "#7A7A7A" },
};

export default function InventoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/inventory");
      setItems(r.data || []);
    } catch (err) {
      console.error("Inventory load failed:", err);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = (it: any) => confirmAction(
    `Delete "${it.name}"?`,
    "Will be moved to Trash. Restore within 30 days.",
    async () => {
      try {
        await api.delete(`/inventory/${it.id}`);
        notify("Moved to Trash");
        load();
      } catch (e: any) {
        notify("Failed", e?.response?.data?.detail || "Try again");
      }
    }
  );

  const visible = filter === "all" ? items : items.filter((x) => x.type === filter);
  const lowStock = items.filter((x) => x.low_stock);

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} testID="inv-close"><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Inventory</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push("/inventory-edit")}
          testID="inv-add-btn"
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {lowStock.length > 0 && (
        <View style={s.alertCard}>
          <Ionicons name="warning" size={18} color={C.danger} />
          <Text style={s.alertText}>
            {lowStock.length} item{lowStock.length !== 1 ? "s" : ""} below reorder threshold
          </Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: S.md, gap: 8, marginTop: 8, paddingBottom: 6, alignItems: "center" }}>
        <Chip label={`ALL (${items.length})`} active={filter === "all"} onPress={() => setFilter("all")} />
        {Object.entries(TYPE_META).map(([k, m]) => {
          const n = items.filter((x) => x.type === k).length;
          if (n === 0) return null;
          return <Chip key={k} label={`${m.label.toUpperCase()} (${n})`} active={filter === k} onPress={() => setFilter(k)} />;
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} />
        ) : visible.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={48} color={C.textMuted} />
            <Text style={s.emptyT}>No inventory yet</Text>
            <Text style={s.emptyS}>Tap + to add your first item (seeds, solutions, nutrients...)</Text>
          </View>
        ) : visible.map((it) => {
          const meta = TYPE_META[it.type] || TYPE_META.other;
          return (
            <TouchableOpacity
              key={it.id}
              style={[s.card, it.low_stock && s.cardAlert]}
              onPress={() => router.push({ pathname: "/inventory-edit", params: { id: it.id } })}
              testID={`inv-${it.id}`}
            >
              <View style={[s.typeTag, { backgroundColor: meta.color }]}>
                <Text style={s.typeTagText}>{meta.label}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{it.name}</Text>
                <Text style={s.itemQty}>
                  <Text style={s.itemQtyNum}>{it.quantity}</Text> {it.unit}
                  {it.threshold ? <Text style={s.itemThreshold}>  (reorder ≤{it.threshold})</Text> : null}
                </Text>
                {it.supplier ? <Text style={s.itemMeta}>Supplier: {it.supplier}</Text> : null}
                {it.expiry_date ? <Text style={s.itemMeta}>Expires: {it.expiry_date}</Text> : null}
                {it.low_stock && <Text style={s.lowStockBadge}>LOW STOCK</Text>}
              </View>
              <TouchableOpacity
                onPress={() => onDelete(it)}
                style={s.delBtn}
                testID={`del-inv-${it.id}`}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color={C.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: any) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipOn]} onPress={onPress}>
      <Text style={[s.chipText, active && { color: "#fff" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  title: { fontSize: 18, fontWeight: "800", color: C.text, flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  alertCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FCE4E1", borderColor: "#F2B4AC", borderWidth: 1, marginHorizontal: S.md, marginTop: 10, padding: 12, borderRadius: 12 },
  alertText: { flex: 1, fontSize: 12, fontWeight: "700", color: C.danger },
  empty: { alignItems: "center", padding: 50, gap: 10 },
  emptyT: { fontSize: 16, fontWeight: "700", color: C.text2 },
  emptyS: { fontSize: 12, color: C.textMuted, textAlign: "center", paddingHorizontal: 30 },
  card: { flexDirection: "row", gap: 10, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 10, alignItems: "center" },
  cardAlert: { borderColor: "#F2B4AC", backgroundColor: "#FFF6F5" },
  typeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start" },
  typeTagText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  itemName: { fontSize: 15, fontWeight: "700", color: C.text },
  itemQty: { fontSize: 13, color: C.text2, marginTop: 3 },
  itemQtyNum: { fontWeight: "800", color: C.text, fontSize: 14 },
  itemThreshold: { fontSize: 10, color: C.textMuted },
  itemMeta: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  lowStockBadge: { fontSize: 9, fontWeight: "800", color: "#fff", backgroundColor: C.danger, alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, letterSpacing: 1 },
  delBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FCE4E1", alignItems: "center", justifyContent: "center" },
  chip: { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 11, fontWeight: "800", color: C.text, letterSpacing: 1 },
});
