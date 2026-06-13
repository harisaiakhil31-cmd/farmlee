import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, subDays } from "date-fns";
import { api } from "../src/api";
import { C, S } from "../src/theme";
import { confirmAction, notify } from "../src/confirm";
import { WebDate } from "../src/WebDateTime";

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 9999 },
];

export default function EnvironmentHistory() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [start, setStart] = useState<Date>(subDays(new Date(), 7));
  const [end, setEnd] = useState<Date>(new Date());
  const [showCustom, setShowCustom] = useState(false);

  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/environment/history", { params: { start: fmt(start), end: fmt(end) } });
      setDays(r.data.days || []);
      setTotal(r.data.total || 0);
    } catch (err) {
      console.error("Env history load failed:", err);
    } finally { setLoading(false); }
  }, [start, end]);

  useEffect(() => { load(); }, [load]);

  const applyPreset = (n: number) => {
    setEnd(new Date());
    setStart(subDays(new Date(), n));
    setShowCustom(false);
  };

  const onDelete = (id: string) => confirmAction(
    "Delete this reading?",
    "It will move to Trash. Restore within 30 days.",
    async () => {
      try {
        await api.delete(`/environment/reading/${id}`);
        load();
      } catch (e: any) {
        notify("Failed", e?.response?.data?.detail || "Try again");
      }
    }
  );

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} testID="envhist-close"><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Environment history</Text>
        <TouchableOpacity onPress={load} style={s.iconBtn}><Ionicons name="refresh" size={20} color={C.text} /></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: S.md, gap: 8, marginTop: 10, paddingBottom: 6, alignItems: "center" }}>
        {PRESETS.map((p) => (
          <TouchableOpacity key={p.label} style={s.chip} onPress={() => applyPreset(p.days)}>
            <Text style={s.chipText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[s.chip, showCustom && s.chipOn]} onPress={() => setShowCustom(!showCustom)}>
          <Text style={[s.chipText, showCustom && { color: "#fff" }]}>Custom</Text>
        </TouchableOpacity>
      </ScrollView>

      {showCustom && (
        <View style={s.custom}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>FROM</Text>
            <WebDate value={start} onChange={setStart} testID="envhist-start" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>TO</Text>
            <WebDate value={end} onChange={setEnd} testID="envhist-end" />
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} />
        ) : days.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="thermometer-outline" size={48} color={C.textMuted} />
            <Text style={s.emptyT}>No environment readings</Text>
            <Text style={s.emptyS}>Try a wider date range, or log a reading from the dashboard.</Text>
          </View>
        ) : (
          <>
            <Text style={s.summaryText}>{total} reading{total !== 1 ? "s" : ""} across {days.length} day{days.length !== 1 ? "s" : ""}</Text>
            {days.map((day) => (
              <View key={day.date} style={s.dayCard}>
                <View style={s.dayHead}>
                  <Text style={s.dayDate}>{day.date}</Text>
                  <View style={s.avgPill}>
                    <Text style={s.avgText}>
                      Avg: {day.avg_temp}°C · {day.avg_hum}%
                    </Text>
                  </View>
                </View>

                {/* Table header */}
                <View style={s.tableHead}>
                  <Text style={[s.th, { flex: 1.3 }]}>SESSION</Text>
                  <Text style={[s.th, { flex: 1 }]}>TIME</Text>
                  <Text style={[s.th, { flex: 1 }]}>TEMP</Text>
                  <Text style={[s.th, { flex: 1 }]}>HUM</Text>
                  <View style={{ width: 32 }} />
                </View>
                {day.items.map((it: any) => (
                  <View key={it.id} style={s.tr}>
                    <Text style={[s.td, { flex: 1.3, fontWeight: "700", textTransform: "capitalize" }]}>{it.session}</Text>
                    <Text style={[s.td, { flex: 1 }]}>{it.check_time || "—"}</Text>
                    <Text style={[s.td, { flex: 1 }]}>{it.temperature}°C</Text>
                    <Text style={[s.td, { flex: 1 }]}>{it.humidity}%</Text>
                    <TouchableOpacity onPress={() => onDelete(it.id)} style={s.delBtn} testID={`envhist-del-${it.id}`}>
                      <Ionicons name="trash-outline" size={14} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: C.text, flex: 1, textAlign: "center" },
  chip: { paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 12, fontWeight: "700", color: C.text },
  custom: { flexDirection: "row", gap: 10, padding: S.md, paddingTop: 6 },
  label: { fontSize: 10, fontWeight: "700", color: C.text2, letterSpacing: 1.5, marginBottom: 4 },
  empty: { alignItems: "center", padding: 50, gap: 10 },
  emptyT: { fontSize: 16, fontWeight: "700", color: C.text2 },
  emptyS: { fontSize: 12, color: C.textMuted, textAlign: "center", paddingHorizontal: 30 },
  summaryText: { fontSize: 12, color: C.text2, marginBottom: 10, fontWeight: "600" },
  dayCard: { backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  dayHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  dayDate: { fontSize: 14, fontWeight: "800", color: C.text, letterSpacing: 0.5 },
  avgPill: { backgroundColor: C.brand, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  avgText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  tableHead: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border, gap: 4 },
  th: { fontSize: 9, fontWeight: "800", color: C.text2, letterSpacing: 1.2 },
  tr: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0eee9", alignItems: "center", gap: 4 },
  td: { fontSize: 13, color: C.text },
  delBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#FCE4E1", alignItems: "center", justifyContent: "center" },
});
