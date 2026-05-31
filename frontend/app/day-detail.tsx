import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../src/api";
import { C, S } from "../src/theme";

export default function DayDetail() {
  const router = useRouter();
  const { day } = useLocalSearchParams<{ day: string }>();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  const load = useCallback(async () => {
    if (!day) { setErr("Missing date"); return; }
    try {
      const r = await api.get(`/calendar/day/${day}`);
      setData(r.data);
    } catch (e: any) {
      console.error("Day detail load failed:", e);
      setErr(e?.response?.data?.detail || e?.message || "Failed to load this day. Check connection.");
    }
  }, [day]);

  useEffect(() => { load(); }, [load]);

  const goBack = () => {
    try { router.back(); } catch { router.replace("/(tabs)/calendar"); }
  };

  // Compose a friendly title even before data loads
  let fmtDay = "Day";
  try { fmtDay = format(new Date(day || new Date()), "EEEE, MMM d, yyyy"); } catch { fmtDay = day || ""; }

  // Always render the header with a working back button, even on error/loading
  const header = (
    <View style={styles.head}>
      <TouchableOpacity onPress={goBack} style={styles.backBtn} testID="day-back-btn">
        <Ionicons name="close" size={24} color={C.text} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{fmtDay}</Text>
      <View style={{ width: 32 }} />
    </View>
  );

  if (err) {
    return (
      <SafeAreaView style={styles.c} edges={["top"]}>
        {header}
        <View style={styles.errBox}>
          <Ionicons name="alert-circle" size={36} color={C.danger} />
          <Text style={styles.errText}>{err}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setErr(""); load(); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.c} edges={["top"]}>
        {header}
        <View style={styles.loading}><ActivityIndicator color={C.brand} size="large" /></View>
      </SafeAreaView>
    );
  }

  const tanks = data.tanks || [];
  const environment = data.environment || [];
  const field = data.field || [];
  const weekly = data.weekly || [];
  const monthly = data.monthly || [];
  const reminders = data.reminders || [];
  const expectedTasks = data.expected_tasks || [];
  const isFuture = !!data.is_future;
  const isToday = !!data.is_today;
  const env_avg = data.env_avg;

  let statusBg = "#F1EDE7";
  let statusIcon: any = "checkmark-done";
  let statusIconColor = C.brand;
  let statusLabel = "HISTORY";
  if (isFuture) { statusBg = "#FFF4EC"; statusIcon = "time-outline"; statusIconColor = C.accent; statusLabel = "UPCOMING"; }
  else if (isToday) { statusBg = "#EFF3DC"; statusIcon = "today-outline"; statusIconColor = C.brand; statusLabel = "TODAY"; }

  const hasAnyEntries =
    tanks.length > 0 || environment.length > 0 || field.length > 0 || weekly.length > 0 || monthly.length > 0;

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      {header}
      <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
        <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
          <Ionicons name={statusIcon} size={14} color={statusIconColor} />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>

        {/* If future: just show expected tasks */}
        {isFuture && (
          <>
            <Text style={styles.section}>EXPECTED TASKS</Text>
            {expectedTasks.map((t: any, i: number) => {
              let dotColor = C.water;
              if (t.type === "daily") dotColor = C.brand;
              else if (t.type === "weekly") dotColor = C.accent;
              return (
                <View key={`exp-${i}-${t.label}`} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <Text style={styles.rowText}>{t.label}</Text>
                  <Text style={styles.rowSide}>{t.type}</Text>
                </View>
              );
            })}
          </>
        )}

        {/* Today or past: show logged data */}
        {!isFuture && (
          <>
            {!hasAnyEntries && (
              <View style={styles.empty} testID="day-empty">
                <Ionicons name="document-text-outline" size={36} color={C.textMuted} />
                <Text style={styles.emptyText}>
                  {isToday
                    ? "Nothing logged yet today. Tap a check from the Dashboard to add an entry."
                    : "No activity was logged on this date."}
                </Text>
              </View>
            )}

            {tanks.length > 0 && (
              <>
                <Text style={styles.section}>TANK READINGS ({tanks.length})</Text>
                {tanks.map((c: any) => (
                  <View key={c.id} style={styles.card}>
                    <Text style={styles.cTitle}>
                      Tank {c.tank_id} · {c.session?.toUpperCase()} · {c.check_time || ""}
                    </Text>
                    <Text style={styles.cBody}>
                      pH: {c.ph_actual ?? "–"} · EC: {c.ec_actual ?? "–"} · T: {c.temp_actual ?? "–"}°C
                    </Text>
                    <Text style={styles.cMeta}>by {c.user_name || "?"}</Text>
                    {c.notes ? <Text style={styles.cNote}>{c.notes}</Text> : null}
                  </View>
                ))}
              </>
            )}

            {environment.length > 0 && (
              <>
                <Text style={styles.section}>ENVIRONMENT ({environment.length})</Text>
                {environment.map((c: any) => (
                  <View key={c.id} style={styles.card}>
                    <Text style={styles.cTitle}>{c.session?.toUpperCase()} · {c.check_time || ""}</Text>
                    <Text style={styles.cBody}>Temp: {c.temperature}°C · Humidity: {c.humidity}%</Text>
                    <Text style={styles.cMeta}>by {c.user_name || "?"}</Text>
                  </View>
                ))}
                {env_avg && (
                  <View style={styles.avgPill}>
                    <Text style={styles.avgText}>
                      Daily avg → Temp {env_avg.temperature}°C · Humidity {env_avg.humidity}%
                    </Text>
                  </View>
                )}
              </>
            )}

            {field.length > 0 && (
              <>
                <Text style={styles.section}>FIELD TASKS ({field.length})</Text>
                {field.map((c: any) => (
                  <View key={c.id} style={styles.card}>
                    <Text style={styles.cTitle}>by {c.user_name || "?"}</Text>
                    <Text style={styles.cBody}>
                      Seedlings watered: {c.seedling_watered ? "✓" : "—"} · Pest: {c.pest_check_done ? "✓" : "—"} · Leaves: {c.leaf_cleaning_done ? "✓" : "—"}
                    </Text>
                    {c.notes ? <Text style={styles.cNote}>{c.notes}</Text> : null}
                  </View>
                ))}
              </>
            )}

            {weekly.length > 0 && (
              <>
                <Text style={styles.section}>WEEKLY CHECKS ({weekly.length})</Text>
                {weekly.map((c: any) => (
                  <View key={c.id} style={styles.card}>
                    <Text style={styles.cTitle}>by {c.user_name || "?"}</Text>
                    <Text style={styles.cBody}>
                      Meter: {c.meter_calibration_done ? "✓" : "—"} · Nutrition: {c.nutrition_quantity_ok ? "✓" : "—"} · Filters: {c.tank_filters_cleaned ? "✓" : "—"}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {monthly.length > 0 && (
              <>
                <Text style={styles.section}>MONTHLY CHECKS ({monthly.length})</Text>
                {monthly.map((c: any) => (
                  <View key={c.id} style={styles.card}>
                    <Text style={styles.cTitle}>by {c.user_name || "?"}</Text>
                    <Text style={styles.cBody}>
                      Tanks cleaned: {c.tanks_cleaned ? "✓" : "—"} · Solutions ordered: {c.solutions_ordered ? "✓" : "—"} · Seeds ordered: {c.seeds_ordered ? "✓" : "—"}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {reminders.length > 0 && (
          <>
            <Text style={styles.section}>REMINDERS</Text>
            {reminders.map((r: any) => {
              let timeStr = "";
              try { timeStr = format(new Date(r.remind_at), "h:mm a"); } catch { timeStr = ""; }
              return (
                <View key={r.id} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: C.accent }]} />
                  <Text style={styles.rowText}>{r.title}</Text>
                  <Text style={styles.rowSide}>{timeStr}</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: C.text, textAlign: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  errBox: { padding: S.lg, alignItems: "center", gap: 12 },
  errText: { fontSize: 14, color: C.text2, textAlign: "center", lineHeight: 20 },
  retryBtn: { backgroundColor: C.brand, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, marginTop: 6 },
  retryText: { color: "#fff", fontWeight: "700" },
  statusTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: S.md,
  },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: C.text },
  section: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.md, marginBottom: S.sm },
  row: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { flex: 1, fontSize: 14, color: C.text },
  rowSide: { fontSize: 10, fontWeight: "700", color: C.text2, letterSpacing: 1, textTransform: "uppercase" },
  card: { backgroundColor: C.card, borderRadius: 14, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  cTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  cBody: { fontSize: 13, color: C.text2, marginTop: 4 },
  cMeta: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  cNote: { fontSize: 12, color: C.textMuted, fontStyle: "italic", marginTop: 4 },
  avgPill: {
    alignSelf: "flex-start", backgroundColor: C.brand, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, marginTop: 4,
  },
  avgText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  empty: {
    alignItems: "center", gap: 10, padding: S.lg, backgroundColor: C.card,
    borderRadius: 16, borderWidth: 1, borderColor: C.border, marginTop: S.md,
  },
  emptyText: { fontSize: 13, color: C.text2, textAlign: "center", lineHeight: 20 },
});
