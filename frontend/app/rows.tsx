import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../src/api";
import { C, S } from "../src/theme";

const STATUS_COLOR: Record<string, { bg: string; fg: string; label: string }> = {
  healthy: { bg: "#E8F6E8", fg: "#3B7A3B", label: "OK" },
  issue: { bg: "#FCE4E1", fg: "#C8412B", label: "!" },
  maintenance: { bg: "#FFF4D6", fg: "#A77503", label: "M" },
  empty: { bg: "#E6E6E6", fg: "#6F6F6F", label: "—" },
};

export default function RowsScreen() {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, lRes] = await Promise.all([
        api.get("/towers"),
        api.get("/towers/logs/recent"),
      ]);
      setData(tRes.data);
      setRecentLogs(lRes.data || []);
    } catch (err) {
      console.error("Towers load failed:", err);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !data) {
    return (
      <SafeAreaView style={s.c} edges={["top"]}>
        <View style={s.head}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
          <Text style={s.title}>Rows & Towers</Text>
          <View style={{ width: 26 }} />
        </View>
        <ActivityIndicator color={C.brand} size="large" style={{ marginTop: 50 }} />
      </SafeAreaView>
    );
  }

  const towersByRow: Record<string, any[]> = {};
  for (const t of data.towers) {
    if (!towersByRow[t.row]) towersByRow[t.row] = [];
    towersByRow[t.row].push(t);
  }

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} testID="rows-close"><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Rows & Towers</Text>
        <TouchableOpacity onPress={load} style={s.iconBtn} testID="rows-refresh"><Ionicons name="refresh" size={20} color={C.text} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Status summary */}
        <View style={s.summary}>
          <SummaryStat label="OK" n={data.summary.healthy} color="#3B7A3B" />
          <SummaryStat label="Issue" n={data.summary.issue} color={C.danger} highlighted={data.summary.issue > 0} />
          <SummaryStat label="Maint." n={data.summary.maintenance} color="#A77503" />
          <SummaryStat label="Empty" n={data.summary.empty} color="#6F6F6F" />
        </View>

        <Text style={s.helper}>Tap any tower to update its status. Rows A–E, 60 towers each.</Text>

        {/* Rows */}
        {(data.rows as string[]).map((row) => (
          <View key={row} style={s.rowBlock}>
            <View style={s.rowHead}>
              <Text style={s.rowName}>ROW {row}</Text>
              <Text style={s.rowCount}>
                {(towersByRow[row] || []).filter((t) => t.status === "issue").length} issues ·{" "}
                {(towersByRow[row] || []).length} towers
              </Text>
            </View>
            <View style={s.towerGrid}>
              {(towersByRow[row] || []).map((t) => {
                const col = STATUS_COLOR[t.status] || STATUS_COLOR.empty;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.tower, { backgroundColor: col.bg }]}
                    onPress={() => router.push({ pathname: "/tower-detail", params: { id: t.id } })}
                    testID={`tower-${row}-${t.position}`}
                  >
                    <Text style={[s.towerNum, { color: col.fg }]}>{t.position}</Text>
                    {t.status === "issue" && <View style={s.issueDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Recent log */}
        {recentLogs.length > 0 && (
          <View style={s.logsBlock}>
            <Text style={s.logsTitle}>RECENT ACTIVITY</Text>
            {recentLogs.slice(0, 15).map((l) => {
              let when = "";
              try { when = format(new Date(l.at), "MMM d · h:mm a"); } catch { /* ignore */ }
              return (
                <View key={l.id} style={s.logRow}>
                  <View style={[s.logDot, { backgroundColor: STATUS_COLOR[l.new_status]?.fg || C.text2 }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.logText}>
                      Tower <Text style={{ fontWeight: "800" }}>{l.row}-{l.position}</Text>: {l.prev_status} → {l.new_status}
                    </Text>
                    {l.note ? <Text style={s.logNote}>"{l.note}"</Text> : null}
                    <Text style={s.logMeta}>{when} · {l.by_user_name || "?"}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryStat({ label, n, color, highlighted }: any) {
  return (
    <View style={[s.stat, highlighted && { borderColor: color, borderWidth: 2 }]}>
      <Text style={[s.statN, { color }]}>{n}</Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  iconBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: C.text },
  helper: { fontSize: 11, color: C.text2, paddingHorizontal: S.md, marginTop: 8, marginBottom: 14, textAlign: "center" },
  summary: { flexDirection: "row", padding: S.md, gap: 8 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: C.border },
  statN: { fontSize: 22, fontWeight: "800" },
  statL: { fontSize: 10, fontWeight: "700", color: C.text2, letterSpacing: 1, marginTop: 2 },
  rowBlock: { paddingHorizontal: S.md, marginBottom: 18 },
  rowHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 },
  rowName: { fontSize: 14, fontWeight: "800", color: C.text, letterSpacing: 2 },
  rowCount: { fontSize: 10, color: C.text2, fontWeight: "600" },
  towerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tower: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
  towerNum: { fontSize: 11, fontWeight: "700" },
  issueDot: { position: "absolute", top: 2, right: 2, width: 6, height: 6, borderRadius: 3, backgroundColor: C.danger },
  logsBlock: { paddingHorizontal: S.md, marginTop: 10 },
  logsTitle: { fontSize: 11, fontWeight: "800", color: C.text2, letterSpacing: 2, marginBottom: 10 },
  logRow: { flexDirection: "row", gap: 10, backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8, alignItems: "flex-start" },
  logDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  logText: { fontSize: 13, color: C.text },
  logNote: { fontSize: 12, color: C.text2, fontStyle: "italic", marginTop: 2 },
  logMeta: { fontSize: 10, color: C.textMuted, marginTop: 3 },
});
