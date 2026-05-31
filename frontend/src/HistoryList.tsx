import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "./api";
import { C, S } from "./theme";

// Cross-platform confirm (Alert.alert callbacks don't fire on RNW)
export const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ]);
  }
};

type HistoryProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  endpoint: string;           // e.g. "/tanks/reading"
  // dateParam: whether to filter by ?date=today
  todayOnly?: boolean;
  // renderItem: how to render each entry's summary
  renderItem: (item: any) => { line1: string; line2?: string; line3?: string };
  // onEdit: parent handles edit (opens its own modal)
  onEdit?: (item: any) => void;
  // refreshKey: bump to force re-fetch
  refreshKey?: number;
};

export default function HistoryList({ open, onClose, title, endpoint, todayOnly, renderItem, onEdit, refreshKey }: HistoryProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (todayOnly) {
        const t = new Date();
        params.date = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
      }
      const r = await api.get(endpoint, { params });
      // Some endpoints return {items, average}, others return array directly
      const list = Array.isArray(r.data) ? r.data : (r.data?.items || []);
      setItems(list);
    } catch (err) {
      console.error("History load failed:", err);
      setItems([]);
    } finally { setLoading(false); }
  }, [endpoint, todayOnly]);

  useEffect(() => { if (open) load(); }, [open, load, refreshKey]);

  const onDelete = (item: any) => {
    confirmAction(
      "Delete this entry?",
      "This action cannot be undone. The entry will be permanently removed.",
      async () => {
        setBusy(item.id);
        try {
          await api.delete(`${endpoint}/${item.id}`);
          setItems((prev) => prev.filter((x) => x.id !== item.id));
        } catch (e: any) {
          Alert.alert("Delete failed", e?.response?.data?.detail || "Try again");
        } finally { setBusy(null); }
      }
    );
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={open} onRequestClose={onClose}>
      <SafeAreaView style={s.c} edges={["top"]}>
        <View style={s.head}>
          <TouchableOpacity onPress={onClose} testID="history-close" style={s.headBtn}>
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={s.title}>{title}</Text>
          <TouchableOpacity onPress={load} style={s.headBtn} testID="history-refresh">
            <Ionicons name="refresh" size={20} color={C.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
          {loading ? (
            <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} />
          ) : items.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="document-text-outline" size={36} color={C.textMuted} />
              <Text style={s.emptyText}>No entries{todayOnly ? " today" : ""} yet.</Text>
            </View>
          ) : items.map((it) => {
            const r = renderItem(it);
            return (
              <View key={it.id} style={s.card} testID={`hist-item-${it.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={s.line1}>{r.line1}</Text>
                  {r.line2 ? <Text style={s.line2}>{r.line2}</Text> : null}
                  {r.line3 ? <Text style={s.line3}>{r.line3}</Text> : null}
                  <Text style={s.meta}>
                    {it.check_date || ""}{it.check_time ? ` · ${it.check_time}` : ""}{it.user_name ? ` · by ${it.user_name}` : ""}
                  </Text>
                </View>
                <View style={s.actions}>
                  {onEdit && (
                    <TouchableOpacity
                      style={[s.iconBtn, { backgroundColor: "#EFF3DC" }]}
                      onPress={() => onEdit(it)}
                      testID={`hist-edit-${it.id}`}
                    >
                      <Ionicons name="create-outline" size={18} color={C.brand} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.iconBtn, { backgroundColor: "#FCE4E1" }]}
                    onPress={() => onDelete(it)}
                    disabled={busy === it.id}
                    testID={`hist-del-${it.id}`}
                  >
                    {busy === it.id
                      ? <ActivityIndicator size="small" color={C.danger} />
                      : <Ionicons name="trash-outline" size={18} color={C.danger} />}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "800", color: C.text },
  empty: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyText: { fontSize: 14, color: C.text2 },
  card: { flexDirection: "row", gap: 10, backgroundColor: C.card, borderRadius: 14, padding: S.md, borderWidth: 1, borderColor: C.border, marginBottom: 10, alignItems: "center" },
  line1: { fontSize: 14, fontWeight: "700", color: C.text },
  line2: { fontSize: 13, color: C.text2, marginTop: 3 },
  line3: { fontSize: 12, color: C.text2, marginTop: 2 },
  meta: { fontSize: 10, color: C.textMuted, marginTop: 4, letterSpacing: 0.3 },
  actions: { flexDirection: "row", gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
