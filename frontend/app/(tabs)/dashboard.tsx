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

  const load = async () => {
    try {
      const u = await getUser();
      setUser(u);
      const r = await api.get("/dashboard");
      setData(r.data);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));

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
          <ActionCard
            testID="action-daily"
            tint="#E8EFD8" icon="water" label="Daily" sub="pH · EC · Temp"
            onPress={() => router.push("/checks/daily")}
          />
          <ActionCard
            testID="action-weekly"
            tint="#F3E4D6" icon="construct" label="Weekly" sub="Calibration · Filters"
            onPress={() => router.push("/checks/weekly")}
          />
          <ActionCard
            testID="action-monthly"
            tint="#DFE8EE" icon="cube" label="Monthly" sub="Tanks · Orders"
            onPress={() => router.push("/checks/monthly")}
          />
          <ActionCard
            testID="action-reminder"
            tint="#EDE4F2" icon="alarm" label="Reminder" sub="Add custom note"
            onPress={() => router.push("/reminder-new")}
          />
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
          {(data?.expected_today || []).map((t: any, i: number) => (
            <View key={i} style={styles.checkRow} testID={`expected-${i}`}>
              <View style={[styles.tag, { backgroundColor: t.type === "daily" ? "#E8EFD8" : t.type === "weekly" ? "#F3E4D6" : "#DFE8EE" }]}>
                <Text style={[styles.tagText, { color: C.text }]}>{t.type}</Text>
              </View>
              <Text style={styles.checkLabel}>{t.label}</Text>
            </View>
          ))}
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
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: value == null ? C.textMuted : inRange ? C.text : C.danger }]}>
        {value != null ? value : "–"}
      </Text>
      <Text style={styles.statUnit}>{unit}</Text>
      {range && value != null && (
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
