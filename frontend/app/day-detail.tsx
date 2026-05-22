import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
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

  useEffect(() => { (async () => {
    try { const r = await api.get(`/calendar/day/${day}`); setData(r.data); }
    catch (err) { console.error("Day detail load failed:", err); }
  })(); }, [day]);

  if (!data) return <SafeAreaView style={styles.c}><Text style={{ padding: S.md, color: C.textMuted }}>Loading…</Text></SafeAreaView>;

  const fmtDay = format(new Date(day), "EEEE, MMM d, yyyy");

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={styles.title}>{fmtDay}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: S.md }}>
        <View style={[styles.tagWrap]}>
          {(() => {
            let bg = "#F1EDE7";
            let iconName: any = "checkmark-done";
            let iconColor = C.brand;
            let label = "HISTORY";
            if (data.is_future) {
              bg = "#FFF4EC"; iconName = "time-outline"; iconColor = C.accent; label = "UPCOMING";
            } else if (data.is_today) {
              bg = "#EFF3DC"; iconName = "today-outline"; iconColor = C.brand; label = "TODAY";
            }
            return (
              <View style={[styles.statusTag, { backgroundColor: bg }]}>
                <Ionicons name={iconName} size={14} color={iconColor} />
                <Text style={styles.statusText}>{label}</Text>
              </View>
            );
          })()}
        </View>

        {data.is_future ? (
          <>
            <Text style={styles.section}>EXPECTED TASKS</Text>
            {(data.expected_tasks || []).map((t: any, i: number) => {
              let dotColor = C.water;
              if (t.type === "daily") dotColor = C.brand;
              else if (t.type === "weekly") dotColor = C.accent;
              return (
                <View key={`${t.type}-${t.label}-${i}`} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <Text style={styles.rowText}>{t.label}</Text>
                  <Text style={styles.rowSide}>{t.type}</Text>
                </View>
              );
            })}
          </>
        ) : (
          <>
            <Section title="DAILY CHECKS" items={data.daily} render={(c: any) => (
              <View>
                <Text style={styles.cTitle}>{c.check_time} · {c.user_name}</Text>
                <Text style={styles.cBody}>
                  pH: {c.ph_value ?? "–"} · EC: {c.ec_value ?? "–"} · T: {c.temperature ?? "–"}°C
                </Text>
                {c.notes ? <Text style={styles.cNote}>{c.notes}</Text> : null}
              </View>
            )} />
            <Section title="WEEKLY CHECKS" items={data.weekly} render={(c: any) => (
              <View>
                <Text style={styles.cTitle}>{c.user_name}</Text>
                <Text style={styles.cBody}>
                  Meter: {c.meter_calibration_done ? "✓" : "—"} · Nutrition: {c.nutrition_quantity_ok ? "✓" : "—"} · Filters: {c.tank_filters_cleaned ? "✓" : "—"}
                </Text>
              </View>
            )} />
            <Section title="MONTHLY CHECKS" items={data.monthly} render={(c: any) => (
              <View>
                <Text style={styles.cTitle}>{c.user_name}</Text>
                <Text style={styles.cBody}>
                  Tanks: {c.tanks_cleaned ? "✓" : "—"} · Solutions ordered: {c.solutions_ordered ? "✓" : "—"} · Seeds ordered: {c.seeds_ordered ? "✓" : "—"}
                </Text>
              </View>
            )} />

            {data.is_today && (data.daily.length === 0 && data.weekly.length === 0 && data.monthly.length === 0) && (
              <View style={styles.empty}>
                <Ionicons name="alert-circle-outline" size={28} color={C.warning} />
                <Text style={styles.emptyText}>No activity logged yet today</Text>
                <TouchableOpacity style={styles.cta} onPress={() => router.replace("/checks/daily")}>
                  <Text style={styles.ctaText}>Log daily check now</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {data.reminders.length > 0 && (
          <>
            <Text style={styles.section}>REMINDERS</Text>
            {data.reminders.map((r: any) => (
              <View key={r.id} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: C.accent }]} />
                <Text style={styles.rowText}>{r.title}</Text>
                <Text style={styles.rowSide}>{format(new Date(r.remind_at), "h:mm a")}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, items, render }: any) {
  if (!items?.length) return null;
  return (
    <>
      <Text style={styles.section}>{title}</Text>
      {items.map((c: any) => (
        <View key={c.id} style={styles.card}>{render(c)}</View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 16, fontWeight: "700", color: C.text },
  tagWrap: { marginBottom: S.md },
  statusTag: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: C.text },
  section: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.md, marginBottom: S.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { flex: 1, fontSize: 14, color: C.text },
  rowSide: { fontSize: 10, fontWeight: "700", color: C.text2, letterSpacing: 1, textTransform: "uppercase" },
  card: { backgroundColor: C.card, borderRadius: 14, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  cTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  cBody: { fontSize: 12, color: C.text2, marginTop: 4 },
  cNote: { fontSize: 12, color: C.textMuted, fontStyle: "italic", marginTop: 4 },
  empty: { alignItems: "center", padding: S.lg, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, gap: 8 },
  emptyText: { fontSize: 13, color: C.text2 },
  cta: { backgroundColor: C.brand, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 8 },
  ctaText: { color: "#fff", fontWeight: "700" },
});
