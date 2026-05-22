import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";

export default function RemindersTab() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    try {
      const r = await api.get("/reminders");
      setItems(r.data);
    } catch {}
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const onDelete = (id: string) =>
    Alert.alert("Delete reminder?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await api.delete(`/reminders/${id}`); load(); } },
    ]);

  const upcoming = items.filter((r) => !r.fired);
  const past = items.filter((r) => r.fired);

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <Text style={styles.label}>YOUR REMINDERS</Text>
        <Text style={styles.title}>Reminders</Text>
        <Text style={styles.sub}>Custom notes that ping you at the right time</Text>
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={() => router.push("/reminder-new")}
        testID="reminder-new-btn"
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.ctaText}>Add new reminder</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>UPCOMING ({upcoming.length})</Text>
        {upcoming.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="alarm-outline" size={36} color={C.textMuted} />
            <Text style={styles.emptyText}>No upcoming reminders</Text>
          </View>
        )}
        {upcoming.map((r) => (
          <View key={r.id} style={styles.card} testID={`reminder-${r.id}`}>
            <View style={styles.iconBox}><Ionicons name="alarm" size={20} color={C.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{r.title}</Text>
              {!!r.description && <Text style={styles.cardDesc}>{r.description}</Text>}
              <Text style={styles.cardTime}>{format(new Date(r.remind_at), "EEE, MMM d · h:mm a")}</Text>
            </View>
            <TouchableOpacity onPress={() => onDelete(r.id)} testID={`del-${r.id}`}>
              <Ionicons name="trash-outline" size={18} color={C.danger} />
            </TouchableOpacity>
          </View>
        ))}

        {past.length > 0 && (
          <>
            <Text style={styles.section}>SENT ({past.length})</Text>
            {past.map((r) => (
              <View key={r.id} style={[styles.card, { opacity: 0.6 }]}>
                <View style={styles.iconBox}><Ionicons name="checkmark-circle" size={20} color={C.success} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text style={styles.cardTime}>{format(new Date(r.remind_at), "MMM d · h:mm a")}</Text>
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

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg, padding: S.md },
  head: { paddingBottom: S.md },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2 },
  title: { fontSize: 32, fontWeight: "800", color: C.text, marginTop: 4, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: C.text2, marginTop: 6 },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: C.brand, paddingVertical: 14, borderRadius: 16, marginBottom: S.md,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  section: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.md, marginBottom: S.sm },
  empty: { alignItems: "center", padding: S.xl, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  emptyText: { fontSize: 13, color: C.textMuted, marginTop: 8 },
  card: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: C.card, borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF4EC", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  cardDesc: { fontSize: 12, color: C.text2, marginTop: 2 },
  cardTime: { fontSize: 11, color: C.accent, fontWeight: "600", marginTop: 4 },
});
