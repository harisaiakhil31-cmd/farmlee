import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ImageBackground,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api, getUser } from "../../src/api";
import { C, S } from "../../src/theme";

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [towerIssues, setTowerIssues] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const u = await getUser();
      setUser(u);
      const [r, iRes] = await Promise.all([
        api.get("/dashboard"),
        api.get("/towers/issues").catch(() => ({ data: [] })),
      ]);
      setData(r.data);
      setTowerIssues(iRes.data || []);
    } catch (err) {
      console.error("Dashboard load failed:", err);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const todayLabel = format(new Date(), "EEEE, MMM d");
  const completed = data?.daily_completed || 0;
  const totalDaily = 6;

  const last = data?.last_daily_check;

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
        showsVerticalScrollIndicator={false}
        testID="dashboard-scroll"
      >
        {/* Greeting */}
        <View style={styles.head}>
          <View>
            <Text style={styles.date}>{todayLabel.toUpperCase()}</Text>
            <Text style={styles.hello} testID="dashboard-greeting">
              Hi, {user?.name?.split(" ")[0] || "there"} 🌱
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bell}
            onPress={() => router.push("/(tabs)/reminders")}
            testID="dashboard-bell"
          >
            <Ionicons name="notifications-outline" size={20} color={C.text} />
            {(data?.upcoming_reminders?.length || 0) > 0 && <View style={styles.dot} />}
          </TouchableOpacity>
        </View>

        {/* Tower issues banner (auto-shows when any tower has status=issue) */}
        {towerIssues.length > 0 && (
          <TouchableOpacity
            style={styles.issuesBanner}
            onPress={() => router.push("/rows")}
            testID="tower-issues-banner"
          >
            <View style={styles.issuesIcon}><Ionicons name="warning" size={22} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.issuesTitle}>
                {towerIssues.length} tower{towerIssues.length !== 1 ? "s" : ""} need{towerIssues.length === 1 ? "s" : ""} attention
              </Text>
              <Text style={styles.issuesSub} numberOfLines={1}>
                {towerIssues.slice(0, 3).map((t) => `${t.row}-${t.position}`).join(", ")}
                {towerIssues.length > 3 ? "  +" + (towerIssues.length - 3) + " more" : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Hero progress card */}
        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1608101913822-5343e10fceba?crop=entropy&cs=srgb&fm=jpg&w=900&q=70" }}
          style={styles.hero}
          imageStyle={{ borderRadius: 28 }}
        >
          <View style={styles.heroOverlay} />
          <Text style={styles.heroLabel}>TODAY'S OPERATIONS</Text>
          <Text style={styles.heroValue}>{completed}/{totalDaily}</Text>
          <Text style={styles.heroSub}>checks logged today</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (completed / totalDaily) * 100)}%` }]} />
          </View>
        </ImageBackground>

        {/* Quick actions - bento */}
        <Text style={styles.section}>Quick checks</Text>
        <View style={styles.bento}>
          <ActionCard testID="action-tanks" tint="#E8EFD8" icon="water" label="Tank reading" sub="4 tanks · AM/Eve · pH/EC/T" onPress={() => router.push("/checks/tanks")} />
          <ActionCard testID="action-env" tint="#FFEFE0" icon="thermometer" label="Environment" sub="Morning/Aft/Eve avg" onPress={() => router.push("/checks/environment")} />
          <ActionCard testID="action-field" tint="#F3E4D6" icon="leaf" label="Field tasks" sub="Seedling · Pest · Leaves" onPress={() => router.push("/checks/field")} />
          <ActionCard testID="action-weekly" tint="#DFE8EE" icon="construct" label="Weekly" sub="Calibration · Filters" onPress={() => router.push("/checks/weekly")} />
          <ActionCard testID="action-monthly" tint="#E5E0D8" icon="cube" label="Monthly" sub="Tanks · A/B/C · Seeds" onPress={() => router.push("/checks/monthly")} />
          <ActionCard testID="action-report" tint="#EDE4F2" icon="stats-chart" label="Weekly report" sub="7-day summary" onPress={() => router.push("/checks/report")} />
          <ActionCard testID="action-reminder" tint="#FFF4EC" icon="alarm" label="Reminder" sub="Add custom note" onPress={() => router.push("/reminder-new")} />
          {user?.role === "admin" && (
            <ActionCard testID="action-audit" tint="#FCE4E1" icon="shield-checkmark" label="Audit log" sub="Admin · login history" onPress={() => router.push("/checks/audit")} />
          )}
          <ActionCard testID="action-rows" tint="#E8F6E8" icon="grid" label="Rows & Towers" sub="5 rows · 60 towers each" onPress={() => router.push("/rows")} />
          <ActionCard testID="action-inventory" tint="#FFF4D6" icon="cube" label="Inventory" sub="Seeds · solutions · stock" onPress={() => router.push("/inventory")} />
        </View>

        {/* Last reading */}
        {last && (
          <>
            <Text style={styles.section}>Last reading</Text>
            <View style={styles.lastCard} testID="last-reading-card">
              <View style={styles.row}>
                <Stat label="pH" value={last.ph_value} unit="" range={last.ph_range} />
                <Stat label="EC" value={last.ec_value} unit="mS/cm" range={last.ec_range} />
                <Stat label="Temp" value={last.temperature} unit="°C" range={last.temperature_range} />
              </View>
              <Text style={styles.lastMeta}>
                Logged by {last.user_name} · {last.check_date} {last.check_time}
              </Text>
            </View>
          </>
        )}

        {/* Expected today */}
        <Text style={styles.section}>Today's checklist</Text>
        <View style={styles.checklist}>
          {(data?.expected_today || []).map((t: any, i: number) => {
            const tagColor =
              t.type === "daily" ? "#E8EFD8" :
              t.type === "weekly" ? "#F3E4D6" : "#DFE8EE";
            return (
              <View key={`exp-${t.type}-${t.label}-${i}`} style={styles.checkRow} testID={`expected-${i}`}>
                <View style={[styles.tag, { backgroundColor: tagColor }]}>
                  <Text style={[styles.tagText, { color: C.text }]}>{t.type}</Text>
                </View>
                <Text style={styles.checkLabel}>{t.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Upcoming reminders */}
        {(data?.upcoming_reminders?.length || 0) > 0 && (
          <>
            <Text style={styles.section}>Upcoming reminders</Text>
            {data.upcoming_reminders.map((r: any) => (
              <View key={r.id} style={styles.remCard}>
                <Ionicons name="alarm-outline" size={20} color={C.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.remTitle}>{r.title}</Text>
                  <Text style={styles.remTime}>
                    {format(new Date(r.remind_at), "MMM d · h:mm a")}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({ icon, label, sub, tint, onPress, testID }: any) {
  return (
    <TouchableOpacity style={[styles.action, { backgroundColor: tint }]} onPress={onPress} testID={testID}>
      <View style={styles.actionIcon}><Ionicons name={icon} size={22} color={C.text} /></View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

function Stat({ label, value, unit, range }: any) {
  const inRange = range && value != null
    ? value >= range.min && value <= range.max
    : true;
  const isMissing = value == null;
  let valueColor = C.text;
  if (isMissing) valueColor = C.textMuted;
  else if (!inRange) valueColor = C.danger;
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor }]}>
        {!isMissing ? value : "–"}
      </Text>
      <Text style={styles.statUnit}>{unit}</Text>
      {range && !isMissing && (
        <View style={[styles.statBadge, { backgroundColor: inRange ? "#E8F6E8" : "#FCE4E1" }]}>
          <Text style={[styles.statBadgeText, { color: inRange ? C.success : C.danger }]}>
            {inRange ? "OK" : "OUT"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.md },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: S.sm, paddingBottom: S.md },
  date: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2 },
  hello: { fontSize: 28, fontWeight: "800", color: C.text, marginTop: 4, letterSpacing: -0.5 },
  bell: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center",
  },
  dot: { position: "absolute", top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger },
  hero: { borderRadius: 28, padding: S.lg, marginBottom: S.lg, minHeight: 180, overflow: "hidden" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(27,46,28,0.55)", borderRadius: 28 },
  heroLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: "#D6DBC4" },
  heroValue: { fontSize: 56, fontWeight: "800", color: "#fff", marginTop: 8, letterSpacing: -2 },
  heroSub: { fontSize: 14, color: "#E6E9D6", marginTop: 4 },
  progressBar: { height: 6, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 3, marginTop: S.md, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#CC7753", borderRadius: 3 },
  section: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.md, marginBottom: S.sm },
  bento: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  issuesBanner: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.danger,
    borderRadius: 16, padding: 14, marginBottom: S.md,
    shadowColor: C.danger, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12,
  },
  issuesIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  issuesTitle: { color: "#fff", fontWeight: "800", fontSize: 14, letterSpacing: 0.3 },
  issuesSub: { color: "#FCEDE9", fontSize: 11, marginTop: 2, fontWeight: "600" },
  action: { width: "48%", borderRadius: 20, padding: S.md, minHeight: 120, justifyContent: "space-between" },
  actionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 17, fontWeight: "700", color: C.text, marginTop: S.sm },
  actionSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  lastCard: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: S.md },
  row: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 10, fontWeight: "700", color: C.text2, letterSpacing: 1.5 },
  statValue: { fontSize: 28, fontWeight: "800", color: C.text, marginTop: 4, letterSpacing: -1 },
  statUnit: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  statBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  lastMeta: { fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: S.sm },
  checklist: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 8 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, width: 64, alignItems: "center" },
  tagText: { fontSize: 9, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  checkLabel: { fontSize: 14, color: C.text, flex: 1 },
  remCard: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card,
    borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  remTitle: { fontSize: 15, fontWeight: "600", color: C.text },
  remTime: { fontSize: 12, color: C.text2, marginTop: 2 },
});
