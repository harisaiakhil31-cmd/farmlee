import { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";
import HistoryList from "../../src/HistoryList";

export default function FieldTasks() {
  const router = useRouter();
  const [seedW, setSeedW] = useState(false); const [seedPh, setSeedPh] = useState(""); const [seedEc, setSeedEc] = useState("");
  const [pest, setPest] = useState(false); const [pestN, setPestN] = useState("");
  const [leaf, setLeaf] = useState(false); const [leafN, setLeafN] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const resetForm = () => {
    setEditingId(null);
    setSeedW(false); setSeedPh(""); setSeedEc("");
    setPest(false); setPestN("");
    setLeaf(false); setLeafN("");
    setNotes("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        check_date: format(new Date(), "yyyy-MM-dd"),
        seedling_watered: seedW,
        seedling_ph: seedPh ? parseFloat(seedPh) : null,
        seedling_ec: seedEc ? parseFloat(seedEc) : null,
        pest_check_done: pest, pest_notes: pestN,
        leaf_cleaning_done: leaf, leaf_notes: leafN,
        notes,
      };
      if (editingId) {
        await api.put(`/field/tasks/${editingId}`, payload);
        Alert.alert("Updated", "Field tasks updated");
      } else {
        await api.post("/field/tasks", payload);
        Alert.alert("Saved", "Field tasks logged");
      }
      resetForm();
      setHistoryKey((k) => k + 1);
      router.back();
    } catch (e: any) { Alert.alert("Failed", e?.response?.data?.detail || "Try again"); }
    finally { setSaving(false); }
  };

  const onEdit = (item: any) => {
    setEditingId(item.id);
    setSeedW(!!item.seedling_watered);
    setSeedPh(item.seedling_ph != null ? String(item.seedling_ph) : "");
    setSeedEc(item.seedling_ec != null ? String(item.seedling_ec) : "");
    setPest(!!item.pest_check_done); setPestN(item.pest_notes || "");
    setLeaf(!!item.leaf_cleaning_done); setLeafN(item.leaf_notes || "");
    setNotes(item.notes || "");
    setHistoryOpen(false);
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>{editingId ? "Edit field tasks" : "Field tasks"}</Text>
        <TouchableOpacity onPress={() => setHistoryOpen(true)} style={s.headIcon} testID="field-history-btn">
          <Ionicons name="time-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{flex:1}}>
        <ScrollView contentContainerStyle={{padding:S.md}}>
          <Text style={s.label}>SEEDLING</Text>
          <Toggle l="Seedlings watered" v={seedW} on={setSeedW} tid="f-seed"/>
          <View style={{flexDirection:"row",gap:8}}>
            <View style={{flex:1}}><Text style={s.label}>pH</Text><TextInput testID="f-sph" style={s.input} value={seedPh} onChangeText={setSeedPh} keyboardType="decimal-pad" placeholderTextColor={C.textMuted}/></View>
            <View style={{flex:1}}><Text style={s.label}>EC</Text><TextInput testID="f-sec" style={s.input} value={seedEc} onChangeText={setSeedEc} keyboardType="decimal-pad" placeholderTextColor={C.textMuted}/></View>
          </View>
          <Text style={s.label}>PEST CHECK</Text>
          <Toggle l="Done" v={pest} on={setPest} tid="f-pest"/>
          <TextInput style={s.input} value={pestN} onChangeText={setPestN} placeholder="Pest notes" placeholderTextColor={C.textMuted} multiline/>
          <Text style={s.label}>LEAF CLEANING</Text>
          <Toggle l="Spoiled leaves removed" v={leaf} on={setLeaf} tid="f-leaf"/>
          <TextInput style={s.input} value={leafN} onChangeText={setLeafN} placeholder="Damage notes" placeholderTextColor={C.textMuted} multiline/>
          <Text style={s.label}>GENERAL NOTES</Text>
          <TextInput style={[s.input,{minHeight:80}]} value={notes} onChangeText={setNotes} multiline placeholderTextColor={C.textMuted}/>
          <TouchableOpacity style={s.save} onPress={save} disabled={saving} testID="field-save">
            <Text style={s.saveText}>{saving ? "Saving..." : editingId ? "Update field tasks" : "Save field tasks"}</Text>
          </TouchableOpacity>
          {editingId && (
            <TouchableOpacity onPress={resetForm} style={{ alignSelf: "center", marginTop: 8 }}>
              <Text style={{ color: C.danger, fontWeight: "700" }}>Cancel edit</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <HistoryList
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Field tasks · history"
        endpoint="/field/tasks"
        renderItem={(it: any) => ({
          line1: `Seedlings ${it.seedling_watered ? "✓" : "—"} · Pest ${it.pest_check_done ? "✓" : "—"} · Leaves ${it.leaf_cleaning_done ? "✓" : "—"}`,
          line2: (it.seedling_ph != null || it.seedling_ec != null) ? `Seedling pH ${it.seedling_ph ?? "–"} · EC ${it.seedling_ec ?? "–"}` : undefined,
          line3: it.notes ? `Notes: ${it.notes}` : undefined,
        })}
        onEdit={onEdit}
        refreshKey={historyKey}
      />
    </SafeAreaView>
  );
}

function Toggle({l,v,on,tid}:any){return (
  <TouchableOpacity style={s.tRow} onPress={()=>on(!v)} testID={tid}>
    <Text style={s.tLabel}>{l}</Text>
    <View style={[s.toggle, v && s.toggleOn]}><View style={[s.dot, v && s.dotOn]}/></View>
  </TouchableOpacity>
);}

const s = StyleSheet.create({
  c:{flex:1,backgroundColor:C.bg},
  head:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:S.md,borderBottomWidth:1,borderBottomColor:C.border,gap:8},
  headIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  title:{fontSize:18,fontWeight:"700",color:C.text},
  label:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:2,marginTop:S.md,marginBottom:6},
  input:{backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,fontSize:15,color:C.text,marginBottom:8},
  tRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",backgroundColor:C.card,padding:14,borderRadius:14,borderWidth:1,borderColor:C.border,marginBottom:8},
  tLabel:{fontSize:14,color:C.text,fontWeight:"500"},
  toggle:{width:44,height:26,borderRadius:13,backgroundColor:C.bg3,padding:2},
  toggleOn:{backgroundColor:C.brand},
  dot:{width:22,height:22,borderRadius:11,backgroundColor:"#fff"},
  dotOn:{transform:[{translateX:18}]},
  save:{backgroundColor:C.brand,borderRadius:16,paddingVertical:16,alignItems:"center",marginTop:S.lg},
  saveText:{color:"#fff",fontWeight:"700",fontSize:16},
});
