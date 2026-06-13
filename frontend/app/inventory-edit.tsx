import { useEffect, useState } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { C, S } from "../src/theme";
import { notify } from "../src/confirm";
import { WebDate } from "../src/WebDateTime";

const TYPES = [
  { v: "seed", l: "Seed" },
  { v: "solution_a", l: "Solution A" },
  { v: "solution_b", l: "Solution B" },
  { v: "solution_c", l: "Solution C" },
  { v: "nutrient", l: "Nutrient" },
  { v: "fertilizer", l: "Fertilizer" },
  { v: "other", l: "Other" },
];

const UNITS = ["kg", "g", "L", "ml", "count", "bag", "bottle", "packet"];

export default function InventoryEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("seed");
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState("kg");
  const [threshold, setThreshold] = useState("0");
  const [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState("");
  const [expiry, setExpiry] = useState<Date | null>(null);
  const [restocked, setRestocked] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (id) {
      (async () => {
        setLoading(true);
        try {
          const r = await api.get("/inventory");
          const found = r.data.find((x: any) => x.id === id);
          if (found) {
            setName(found.name || "");
            setType(found.type || "other");
            setQuantity(String(found.quantity ?? 0));
            setUnit(found.unit || "kg");
            setThreshold(String(found.threshold ?? 0));
            setSupplier(found.supplier || "");
            setCost(found.cost_per_unit != null ? String(found.cost_per_unit) : "");
            setExpiry(found.expiry_date ? new Date(found.expiry_date) : null);
            setRestocked(found.last_restocked ? new Date(found.last_restocked) : null);
            setNotes(found.notes || "");
          }
        } catch (err) {
          console.error("Load inventory item failed:", err);
        } finally { setLoading(false); }
      })();
    }
  }, [id]);

  const save = async () => {
    if (!name.trim()) return notify("Required", "Enter item name");
    setSaving(true);
    try {
      const fmt = (d: Date | null) => d ? d.toISOString().slice(0, 10) : null;
      const payload = {
        name: name.trim(),
        type,
        quantity: parseFloat(quantity) || 0,
        unit,
        threshold: parseFloat(threshold) || 0,
        supplier,
        cost_per_unit: cost ? parseFloat(cost) : null,
        expiry_date: fmt(expiry),
        last_restocked: fmt(restocked),
        notes,
      };
      if (editing) await api.put(`/inventory/${id}`, payload);
      else await api.post("/inventory", payload);
      router.back();
    } catch (e: any) {
      notify("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.c} edges={["top"]}>
        <View style={s.head}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
          <Text style={s.title}>Edit item</Text>
          <View style={{ width: 26 }} />
        </View>
        <ActivityIndicator color={C.brand} style={{ marginTop: 50 }} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} testID="inv-back"><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>{editing ? "Edit item" : "New inventory item"}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
          <Text style={s.label}>NAME *</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. Spinach seeds" placeholderTextColor={C.textMuted} testID="inv-name" />

          <Text style={s.label}>TYPE</Text>
          <View style={s.row}>
            {TYPES.map((t) => (
              <TouchableOpacity key={t.v} style={[s.chip, type === t.v && s.chipOn]} onPress={() => setType(t.v)} testID={`type-${t.v}`}>
                <Text style={[s.chipText, type === t.v && { color: "#fff" }]}>{t.l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 2 }}>
              <Text style={s.label}>QUANTITY</Text>
              <TextInput style={s.input} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" testID="inv-qty" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>UNIT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {UNITS.map((u) => (
                  <TouchableOpacity key={u} style={[s.unitChip, unit === u && s.unitChipOn]} onPress={() => setUnit(u)}>
                    <Text style={[s.chipText, unit === u && { color: "#fff" }]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <Text style={s.label}>REORDER THRESHOLD</Text>
          <Text style={s.helper}>Alert when quantity falls at or below this number.</Text>
          <TextInput style={s.input} value={threshold} onChangeText={setThreshold} keyboardType="decimal-pad" testID="inv-threshold" />

          <Text style={s.label}>SUPPLIER</Text>
          <TextInput style={s.input} value={supplier} onChangeText={setSupplier} placeholder="Optional" placeholderTextColor={C.textMuted} />

          <Text style={s.label}>COST PER UNIT</Text>
          <TextInput style={s.input} value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="Optional" placeholderTextColor={C.textMuted} />

          <Text style={s.label}>EXPIRY DATE</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <WebDate value={expiry || new Date()} onChange={setExpiry} testID="inv-expiry" />
            </View>
            {expiry && <TouchableOpacity onPress={() => setExpiry(null)} style={s.clearBtn}><Ionicons name="close" size={14} color={C.danger} /></TouchableOpacity>}
          </View>

          <Text style={s.label}>LAST RESTOCKED</Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <WebDate value={restocked || new Date()} onChange={setRestocked} testID="inv-restocked" />
            </View>
            {restocked && <TouchableOpacity onPress={() => setRestocked(null)} style={s.clearBtn}><Ionicons name="close" size={14} color={C.danger} /></TouchableOpacity>}
          </View>

          <Text style={s.label}>NOTES</Text>
          <TextInput style={[s.input, { minHeight: 80 }]} value={notes} onChangeText={setNotes} multiline placeholder="Optional" placeholderTextColor={C.textMuted} />

          <TouchableOpacity style={s.save} onPress={save} disabled={saving} testID="inv-save">
            <Text style={s.saveText}>{saving ? "Saving..." : editing ? "Update item" : "Save item"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: "800", color: C.text },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: 14, marginBottom: 6 },
  helper: { fontSize: 11, color: C.text2, marginBottom: 6 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 15, color: C.text },
  row: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  chipOn: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 12, fontWeight: "700", color: C.text },
  unitChip: { paddingHorizontal: 10, paddingVertical: 9, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginRight: 6 },
  unitChipOn: { backgroundColor: C.brand, borderColor: C.brand },
  clearBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#FCE4E1", alignItems: "center", justifyContent: "center" },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
