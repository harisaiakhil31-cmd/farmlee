import { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";

export default function CalendarTab() {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");
  const [selected, setSelected] = useState(today);
  const [marks, setMarks] = useState<any>({});

  const load = async () => {
    const start = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
    const end = format(new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0), "yyyy-MM-dd");
    try {
      const r = await api.get("/calendar", { params: { start, end } });
      const m: any = {};
      [...r.data.daily, ...r.data.weekly, ...r.data.monthly].forEach((c: any) => {
        m[c.check_date] = { marked: true, dotColor: C.brand };
      });
      r.data.reminders.forEach((rem: any) => {
        const d = format(new Date(rem.remind_at), "yyyy-MM-dd");
        m[d] = { ...(m[d] || {}), marked: true, dotColor: C.accent };
      });
      setMarks(m);
    } catch {}
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <Text style={styles.label}>OPERATIONS</Text>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.sub}>Tap a date to see logged activity & upcoming tasks</Text>
      </View>

      <View style={styles.calCard}>
        <Calendar
          testID="calendar-view"
          current={selected}
          onDayPress={(d: DateData) => {
            setSelected(d.dateString);
            router.push({ pathname: "/day-detail", params: { day: d.dateString } });
          }}
          markedDates={{
            ...marks,
            [selected]: { ...(marks[selected] || {}), selected: true, selectedColor: C.brand },
          }}
          theme={{
            backgroundColor: C.card,
            calendarBackground: C.card,
            textSectionTitleColor: C.text2,
            selectedDayBackgroundColor: C.brand,
            selectedDayTextColor: "#fff",
            todayTextColor: C.accent,
            dayTextColor: C.text,
            arrowColor: C.brand,
            monthTextColor: C.text,
            textMonthFontWeight: "700",
            textDayFontWeight: "500",
            textDayHeaderFontWeight: "700",
          }}
        />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: C.brand }]} />
          <Text style={styles.legendText}>Logged check</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: C.accent }]} />
          <Text style={styles.legendText}>Reminder</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={() => router.push({ pathname: "/day-detail", params: { day: today } })}
        testID="open-today"
      >
        <Text style={styles.ctaText}>Open Today's view</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg, padding: S.md },
  head: { paddingBottom: S.md },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2 },
  title: { fontSize: 32, fontWeight: "800", color: C.text, marginTop: 4, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: C.text2, marginTop: 6 },
  calCard: { backgroundColor: C.card, borderRadius: 24, padding: 8, borderWidth: 1, borderColor: C.border },
  legend: { flexDirection: "row", gap: 16, marginTop: S.md, paddingLeft: S.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: C.text2 },
  cta: { marginTop: S.lg, backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
