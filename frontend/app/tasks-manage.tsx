import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { C, S } from "../src/theme";
import { confirmAction, notify } from "../src/confirm";

export default function TasksManage() {
  const router = useRouter();
  const { frequency = "weekly" } = useLocalSearchParams<{ frequency?: string }>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/tasks", { params: { frequency } });
      setTasks(r.data || []);
    } catch (err) {
      console.error("Tasks load failed:", err);
    } finally { setLoading(false); }
  }, [frequency]);

  useEffect(() => { load(); }, [load]);

  const onDelete = (t: any) => confirmAction(
    `Delete "${t.name}"?`,
    "Moves to Trash. Existing check entries that referenced this task are unaffected.",
    async () => {
      try {
        await api.delete(`/tasks/${t.id}`);
        load();
      } catch (e: any) { notify("Failed", e?.response?.data?.detail || "Try again"); }
    }
  );

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>{frequency === "monthly" ? "Monthly tasks" : "Weekly tasks"}</Text>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => setEditing({ name: "", description: "", frequency, order: tasks.length, active: true })}
          testID="task-add-btn"
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={s.helper}>
        Manage the {frequency} task checklist. Add, edit, or remove items — they will appear on the {frequency} check form.
      </Text>

      <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
        {loading ? <ActivityIndicator color={C.brand} style={{ marginTop: 40 }} /> :
         tasks.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="list-outline" size={48} color={C.textMuted} />
            <Text style={s.emptyT}>No {frequency} tasks yet</Text>
            <Text style={s.emptyS}>Tap + to add your first task</Text>
          </View>
        ) : tasks.map((t, idx) => (
          <View key={t.id} style={s.card}>
            <View style={s.numBox}><Text style={s.num}>{idx + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.tName}>{t.name}</Text>
              {!!t.description && <Text style={s.tDesc}>{t.description}</Text>}
            </View>
            <TouchableOpacity onPress={() => setEditing(t)} style={[s.iconBtn, { backgroundColor: "#EFF3DC" }]} testID={`task-edit-${t.id}`}>
              <Ionicons name="create-outline" size={18} color={C.brand} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(t)} style={[s.iconBtn, { backgroundColor: "#FCE4E1" }]} testID={`task-del-${t.id}`}>
              <Ionicons name="trash-outline" size={18} color={C.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <EditModal
        task={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    </SafeAreaView>
  );
}

function EditModal({ task, onClose, onSaved }: any) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) { setName(task.name || ""); setDesc(task.description || ""); }
  }, [task]);

  if (!task) return null;
  const editing = !!task.id;

  const save = async () => {
    if (!name.trim()) return notify("Required", "Enter task name");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: desc.trim(),
        frequency: task.frequency,
        order: task.order ?? 0,
        active: true,
      };
      if (editing) await api.put(`/tasks/${task.id}`, payload);
      else await api.post("/tasks", payload);
      onSaved();
    } catch (e: any) {
      notify("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={!!task} onRequestClose={onClose}>
      <SafeAreaView style={s.c} edges={["top"]}>
        <View style={s.head}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
          <Text style={s.title}>{editing ? "Edit task" : "New task"}</Text>
          <View style={{ width: 26 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: S.md }}>
            <Text style={s.label}>TASK NAME *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Clean tank filters" placeholderTextColor={C.textMuted} testID="task-name-input" />
            <Text style={s.label}>DESCRIPTION</Text>
            <TextInput style={[s.input, { minHeight: 80 }]} value={desc} onChangeText={setDesc} placeholder="Optional details for whoever performs this task" placeholderTextColor={C.textMuted} multiline />
            <TouchableOpacity style={s.save} onPress={save} disabled={saving} testID="task-save-btn">
              <Text style={s.saveText}>{saving ? "Saving..." : editing ? "Update task" : "Add task"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
  title: { fontSize: 18, fontWeight: "800", color: C.text, flex: 1, textAlign: "center" },
  addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  helper: { fontSize: 12, color: C.text2, paddingHorizontal: S.md, paddingTop: 10 },
  empty: { alignItems: "center", padding: 50, gap: 10 },
  emptyT: { fontSize: 16, fontWeight: "700", color: C.text2 },
  emptyS: { fontSize: 12, color: C.textMuted },
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  numBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EFF3DC", alignItems: "center", justifyContent: "center" },
  num: { fontSize: 14, fontWeight: "800", color: C.brand },
  tName: { fontSize: 14, fontWeight: "700", color: C.text },
  tDesc: { fontSize: 12, color: C.text2, marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 15, color: C.text },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 18 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
