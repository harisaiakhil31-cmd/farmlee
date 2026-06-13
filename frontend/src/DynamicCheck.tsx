import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "./api";
import { C, S } from "./theme";
import HistoryList from "./HistoryList";
import { notify } from "./confirm";

type Frequency = "weekly" | "monthly";

export default function DynamicCheck({ frequency = "weekly" as Frequency, title }: { frequency?: Frequency; title?: string }) {
  return <CheckBody frequency={frequency} title={title || (frequency === "monthly" ? "Monthly check" : "Weekly check")} />;
}

export function CheckBody({ frequency, title }: { frequency: Frequency; title: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  // task_results: { [task_id]: { done, notes } }
  const [results, setResults] = useState<Record<string, { done: boolean; notes: string }>>({});
  const [generalNotes, setGeneralNotes] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/tasks", { params: { frequency } });
      const list = r.data || [];
      setTasks(list);
      // Initialize result state if not already set
      setResults((prev) => {
        const next = { ...prev };
        for (const t of list) if (!next[t.id]) next[t.id] = { done: false, notes: "" };
        return next;
      });
    } catch (err) {
      console.error("Tasks load failed:", err);
    } finally { setLoading(false); }
  }, [frequency]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const resetForm = () => {
    setEditingId(null);
    const empty: Record<string, any> = {};
    for (const t of tasks) empty[t.id] = { done: false, notes: "" };
    setResults(empty);
    setGeneralNotes("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        check_date: format(new Date(), "yyyy-MM-dd"),
        notes: generalNotes,
        task_results: results,
        // Keep these compatibility-shim fields so existing reports/queries still work
        meter_calibration_done: false,
        nutrition_quantity_ok: false,
        nutrition_notes: "",
        tank_filters_cleaned: false,
        tanks_cleaned: false,
        salt_formation_ok: false,
        salt_notes: "",
        solution_a_qty: null,
        solution_b_qty: null,
        solution_c_qty: null,
        solutions_ordered: false,
        seeds_qty_ok: false,
        seeds_ordered: false,
      };
      // Best-effort: map known task names to legacy flags for back-compat with weekly report
      for (const t of tasks) {
        const r = results[t.id];
        if (!r?.done) continue;
        const n = (t.name || "").toLowerCase();
        if (frequency === "weekly") {
          if (n.includes("meter")) payload.meter_calibration_done = true;
          if (n.includes("nutrition")) { payload.nutrition_quantity_ok = true; payload.nutrition_notes = r.notes || ""; }
          if (n.includes("filter")) payload.tank_filters_cleaned = true;
        } else {
          if (n.includes("tanks cleaned") || n.includes("tank clean")) payload.tanks_cleaned = true;
          if (n.includes("salt")) { payload.salt_formation_ok = true; payload.salt_notes = r.notes || ""; }
          if (n.includes("solution") && n.includes("order")) payload.solutions_ordered = true;
          if (n.includes("seeds") && n.includes("stock")) payload.seeds_qty_ok = true;
          if (n.includes("seeds") && n.includes("order")) payload.seeds_ordered = true;
        }
      }
      const path = frequency === "monthly" ? "/checks/monthly" : "/checks/weekly";
      if (editingId) {
        await api.put(`${path}/${editingId}`, payload);
        notify("Updated", `${title} updated`);
      } else {
        await api.post(path, payload);
        notify("Saved", `${title} logged`);
      }
      resetForm();
      setHistoryKey((k) => k + 1);
      router.back();
    } catch (e: any) {
      notify("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  const onEdit = (item: any) => {
    setEditingId(item.id);
    const tr = item.task_results || {};
    const next: Record<string, any> = {};
    for (const t of tasks) next[t.id] = tr[t.id] || { done: false, notes: "" };
    setResults(next);
    setGeneralNotes(item.notes || "");
    setHistoryOpen(false);
  };

  const completed = Object.values(results).filter((r: any) => r.done).length;

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>{editingId ? `Edit ${frequency} check` : title}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity onPress={() => router.push({ pathname: "/tasks-manage", params: { frequency } })} style={s.headIcon} testID="manage-tasks-btn">
            <Ionicons name="settings-outline" size={20} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setHistoryOpen(true)} style={s.headIcon} testID={`${frequency}-history-btn`}>
            <Ionicons name="time-outline" size={20} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
          {loading ? (
            <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} />
          ) : tasks.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="list-outline" size={48} color={C.textMuted} />
              <Text style={s.emptyT}>No {frequency} tasks defined</Text>
              <Text style={s.emptyS}>Tap the gear icon ⚙ above to add your task list.</Text>
              <TouchableOpacity style={s.openMgr} onPress={() => router.push({ pathname: "/tasks-manage", params: { frequency } })}>
                <Text style={s.openMgrText}>Manage tasks</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.progress}>{completed} / {tasks.length} done</Text>
              {tasks.map((t, idx) => {
                const r = results[t.id] || { done: false, notes: "" };
                return (
                  <View key={t.id} style={[s.taskCard, r.done && s.taskCardDone]}>
                    <TouchableOpacity
                      style={s.taskHead}
                      onPress={() => setResults((prev) => ({ ...prev, [t.id]: { ...r, done: !r.done } }))}
                      testID={`task-toggle-${t.id}`}
                    >
                      <View style={[s.check, r.done && s.checkOn]}>
                        {r.done && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.tName, r.done && { textDecorationLine: "line-through", color: C.text2 }]}>
                          {idx + 1}. {t.name}
                        </Text>
                        {!!t.description && <Text style={s.tDesc}>{t.description}</Text>}
                      </View>
                    </TouchableOpacity>
                    {r.done && (
                      <TextInput
                        style={s.taskNotes}
                        value={r.notes}
                        onChangeText={(v) => setResults((prev) => ({ ...prev, [t.id]: { ...r, notes: v } }))}
                        placeholder="Notes (optional)"
                        placeholderTextColor={C.textMuted}
                        testID={`task-notes-${t.id}`}
                      />
                    )}
                  </View>
                );
              })}

              <Text style={s.label}>GENERAL NOTES</Text>
              <TextInput style={[s.input, { minHeight: 80 }]} value={generalNotes} onChangeText={setGeneralNotes}
                placeholder="Anything else worth recording" placeholderTextColor={C.textMuted} multiline />

              <TouchableOpacity style={s.save} onPress={save} disabled={saving} testID={`${frequency}-save`}>
                <Text style={s.saveText}>{saving ? "Saving..." : editingId ? `Update ${frequency} check` : `Save ${frequency} check`}</Text>
              </TouchableOpacity>
              {editingId && (
                <TouchableOpacity onPress={resetForm} style={{ alignSelf: "center", marginTop: 8 }}>
                  <Text style={{ color: C.danger, fontWeight: "700" }}>Cancel edit</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <HistoryList
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`${title} · history`}
        endpoint={frequency === "monthly" ? "/checks/monthly" : "/checks/weekly"}
        renderItem={(it: any) => {
          const tr = it.task_results || {};
          const doneCount = Object.values(tr).filter((r: any) => r?.done).length;
          const totalCount = Object.keys(tr).length;
          return {
            line1: totalCount > 0 ? `${doneCount} / ${totalCount} tasks done` : `Logged ${it.check_date || ""}`,
            line2: it.notes ? `Notes: ${it.notes}` : undefined,
          };
        }}
        onEdit={onEdit}
        refreshKey={historyKey}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  headIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: C.text, flex: 1, textAlign: "center" },
  empty: { alignItems: "center", padding: 40, gap: 10 },
  emptyT: { fontSize: 16, fontWeight: "700", color: C.text2 },
  emptyS: { fontSize: 12, color: C.textMuted, textAlign: "center" },
  openMgr: { backgroundColor: C.brand, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  openMgrText: { color: "#fff", fontWeight: "700" },
  progress: { fontSize: 12, fontWeight: "700", color: C.brand, marginBottom: 12, letterSpacing: 1 },
  taskCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10 },
  taskCardDone: { backgroundColor: "#F4F7E8", borderColor: "#D9DFB8" },
  taskHead: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: C.brand, alignItems: "center", justifyContent: "center", marginTop: 2 },
  checkOn: { backgroundColor: C.brand },
  tName: { fontSize: 14, fontWeight: "700", color: C.text },
  tDesc: { fontSize: 12, color: C.text2, marginTop: 3 },
  taskNotes: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, fontSize: 13, marginTop: 10, color: C.text },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 14, color: C.text },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 18 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
