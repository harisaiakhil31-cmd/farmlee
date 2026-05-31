import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, Modal, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";
import HistoryList from "../../src/HistoryList";

type TankAssignment = {
  tank_id: number;
  crop_id: string | null;
  stage_index: number;
  crop?: any | null;
  stage?: any | null;
};

export default function TankReading() {
  const router = useRouter();

  // form state
  const [tank, setTank] = useState(1);
  const [session, setSession] = useState<"morning" | "evening">("morning");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ph, setPh] = useState("");
  const [phMin, setPhMin] = useState("5.5");
  const [phMax, setPhMax] = useState("6.5");
  const [ec, setEc] = useState("");
  const [ecMin, setEcMin] = useState("1.2");
  const [ecMax, setEcMax] = useState("2.5");
  const [temp, setTemp] = useState("");
  const [tMin, setTMin] = useState("18");
  const [tMax, setTMax] = useState("26");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // assignment + history state
  const [assignments, setAssignments] = useState<TankAssignment[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const loadAssignments = useCallback(async () => {
    try {
      const [aRes, cRes] = await Promise.all([
        api.get("/tanks/assignments"),
        api.get("/crops"),
      ]);
      setAssignments(aRes.data || []);
      setCrops(cRes.data || []);
    } catch (err) {
      console.error("Tank assignments load failed:", err);
    }
  }, []);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  // When the selected tank or assignments change, auto-fill the target ranges from the assigned crop+stage.
  useEffect(() => {
    if (editingId) return; // editing an existing reading — don't auto-overwrite
    const a = assignments.find((x) => x.tank_id === tank);
    if (a && a.stage) {
      const st = a.stage;
      if (st.ph_min != null) setPhMin(String(st.ph_min));
      if (st.ph_max != null) setPhMax(String(st.ph_max));
      if (st.ec_min != null) setEcMin(String(st.ec_min));
      if (st.ec_max != null) setEcMax(String(st.ec_max));
      if (st.temp_min != null) setTMin(String(st.temp_min));
      if (st.temp_max != null) setTMax(String(st.temp_max));
    }
  }, [tank, assignments, editingId]);

  const currentAssignment = assignments.find((x) => x.tank_id === tank);

  const ok = (v: string, mi: string, ma: string) => {
    const n = parseFloat(v); if (isNaN(n)) return true;
    return n >= parseFloat(mi) && n <= parseFloat(ma);
  };

  const resetForm = () => {
    setEditingId(null);
    setPh(""); setEc(""); setTemp(""); setNotes("");
    // ranges will be re-auto-filled by the effect above
  };

  const save = async () => {
    if (!ph || !ec || !temp) return Alert.alert("Required", "Enter pH, EC and Temperature");
    setSaving(true);
    try {
      const now = new Date();
      const payload = {
        check_date: format(now, "yyyy-MM-dd"),
        check_time: format(now, "HH:mm"),
        session, tank_id: tank,
        ph_actual: parseFloat(ph), ph_target_min: parseFloat(phMin), ph_target_max: parseFloat(phMax),
        ec_actual: parseFloat(ec), ec_target_min: parseFloat(ecMin), ec_target_max: parseFloat(ecMax),
        temp_actual: parseFloat(temp), temp_target_min: parseFloat(tMin), temp_target_max: parseFloat(tMax),
        notes,
      };
      if (editingId) {
        await api.put(`/tanks/reading/${editingId}`, payload);
        Alert.alert("Updated", `Tank ${tank} (${session}) updated`);
      } else {
        await api.post("/tanks/reading", payload);
        Alert.alert("Saved", `Tank ${tank} (${session}) recorded`);
      }
      resetForm();
      setHistoryKey((k) => k + 1);
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    }
    finally { setSaving(false); }
  };

  const onEdit = (item: any) => {
    setEditingId(item.id);
    setTank(item.tank_id); setSession(item.session);
    setPh(String(item.ph_actual ?? "")); setPhMin(String(item.ph_target_min ?? "")); setPhMax(String(item.ph_target_max ?? ""));
    setEc(String(item.ec_actual ?? "")); setEcMin(String(item.ec_target_min ?? "")); setEcMax(String(item.ec_target_max ?? ""));
    setTemp(String(item.temp_actual ?? "")); setTMin(String(item.temp_target_min ?? "")); setTMax(String(item.temp_target_max ?? ""));
    setNotes(item.notes || "");
    setHistoryOpen(false);
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} testID="tanks-back"><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>{editingId ? "Edit tank reading" : "Tank reading"}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity onPress={() => setAssignModal(true)} style={s.headIcon} testID="tanks-assign-btn">
            <Ionicons name="leaf-outline" size={20} color={C.brand} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setHistoryOpen(true)} style={s.headIcon} testID="tanks-history-btn">
            <Ionicons name="time-outline" size={20} color={C.text} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md }}>
          {editingId && (
            <View style={s.editBanner}>
              <Ionicons name="create-outline" size={16} color={C.accent} />
              <Text style={s.editBannerText}>Editing existing reading</Text>
              <TouchableOpacity onPress={resetForm} testID="cancel-edit">
                <Text style={s.cancelEdit}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={s.label}>SESSION</Text>
          <View style={s.row}>
            {(["morning","evening"] as const).map(x => (
              <TouchableOpacity key={x} style={[s.chip, session===x && s.chipOn]} onPress={()=>setSession(x)} testID={`s-${x}`}>
                <Ionicons name={x==="morning"?"sunny":"moon"} size={14} color={session===x?"#fff":C.text} />
                <Text style={[s.chipText, session===x && {color:"#fff"}]}>{x.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>TANK</Text>
          <View style={s.row}>
            {[1,2,3,4].map(n => (
              <TouchableOpacity key={n} style={[s.chip, tank===n && s.chipOn]} onPress={()=>setTank(n)} testID={`t-${n}`}>
                <Text style={[s.chipText, tank===n && {color:"#fff"}]}>Tank {n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Crop assignment card */}
          <View style={s.cropCard}>
            <Ionicons name="leaf" size={20} color={C.brand} />
            <View style={{ flex: 1 }}>
              {currentAssignment?.crop ? (
                <>
                  <Text style={s.cropTitle}>
                    Tank {tank}: {currentAssignment.crop.name}
                    {currentAssignment.stage ? ` · ${currentAssignment.stage.name}` : ""}
                  </Text>
                  <Text style={s.cropSub}>
                    Targets auto-filled from this crop. You can override any value below.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={s.cropTitle}>Tank {tank}: no crop assigned</Text>
                  <Text style={s.cropSub}>Tap the leaf icon to assign a crop + stage so targets auto-fill.</Text>
                </>
              )}
            </View>
            <TouchableOpacity onPress={() => setAssignModal(true)} testID="open-assign-modal">
              <Ionicons name="chevron-forward" size={20} color={C.text2} />
            </TouchableOpacity>
          </View>

          <Field label="pH" v={ph} setV={setPh} mi={phMin} setMi={setPhMin} ma={phMax} setMa={setPhMax} ok={ok(ph,phMin,phMax)} tid="ph"/>
          <Field label="EC (mS/cm)" v={ec} setV={setEc} mi={ecMin} setMi={setEcMin} ma={ecMax} setMa={setEcMax} ok={ok(ec,ecMin,ecMax)} tid="ec"/>
          <Field label="Temperature (°C)" v={temp} setV={setTemp} mi={tMin} setMi={setTMin} ma={tMax} setMa={setTMax} ok={ok(temp,tMin,tMax)} tid="temp"/>

          <Text style={s.label}>NOTES</Text>
          <TextInput style={s.notes} value={notes} onChangeText={setNotes} multiline placeholder="Optional" placeholderTextColor={C.textMuted}/>

          <TouchableOpacity style={s.save} onPress={save} disabled={saving} testID="tank-save">
            <Text style={s.saveText}>
              {saving ? "Saving..." : editingId ? `Update Tank ${tank} (${session})` : `Save Tank ${tank} (${session})`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* History modal */}
      <HistoryList
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Tank readings · history"
        endpoint="/tanks/reading"
        renderItem={(it: any) => ({
          line1: `Tank ${it.tank_id} · ${it.session?.toUpperCase()}`,
          line2: `pH ${it.ph_actual} · EC ${it.ec_actual} · T ${it.temp_actual}°C`,
          line3: it.notes ? `Notes: ${it.notes}` : undefined,
        })}
        onEdit={onEdit}
        refreshKey={historyKey}
      />

      {/* Crop assignment modal */}
      <AssignModal
        open={assignModal}
        onClose={() => setAssignModal(false)}
        tankId={tank}
        crops={crops}
        current={currentAssignment}
        onSaved={async () => { setAssignModal(false); await loadAssignments(); }}
      />
    </SafeAreaView>
  );
}

function AssignModal({ open, onClose, tankId, crops, current, onSaved }: any) {
  const [cropId, setCropId] = useState<string | null>(current?.crop_id || null);
  const [stageIdx, setStageIdx] = useState<number>(current?.stage_index ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCropId(current?.crop_id || null);
    setStageIdx(current?.stage_index ?? 0);
  }, [current, open]);

  const selectedCrop = crops.find((c: any) => c.id === cropId);
  const stages = selectedCrop?.stages || [];

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/tanks/assignments/${tankId}`, {
        crop_id: cropId,
        stage_index: stageIdx,
        notes: "",
      });
      onSaved();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    } finally { setSaving(false); }
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={open} onRequestClose={onClose}>
      <SafeAreaView style={s.c} edges={["top"]}>
        <View style={s.head}>
          <TouchableOpacity onPress={onClose} style={s.headIcon}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
          <Text style={s.title}>Tank {tankId} crop</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>
          <Text style={s.helper}>
            Pick the crop + stage growing in Tank {tankId}. Future tank readings will auto-fill pH/EC/temp target ranges from the stage. You can still override any value per-reading.
          </Text>

          <Text style={s.label}>CROP</Text>
          <View style={s.row}>
            <TouchableOpacity
              style={[s.bigChip, cropId === null && s.bigChipOn]}
              onPress={() => { setCropId(null); setStageIdx(0); }}
              testID="crop-none"
            >
              <Text style={[s.bigChipText, cropId === null && { color: "#fff" }]}>No crop</Text>
            </TouchableOpacity>
            {crops.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={[s.bigChip, cropId === c.id && s.bigChipOn]}
                onPress={() => { setCropId(c.id); setStageIdx(0); }}
                testID={`crop-${c.id}`}
              >
                <Text style={[s.bigChipText, cropId === c.id && { color: "#fff" }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedCrop && stages.length > 0 && (
            <>
              <Text style={s.label}>STAGE</Text>
              {stages.map((st: any, i: number) => (
                <TouchableOpacity
                  key={`stage-${i}-${st.name}`}
                  style={[s.stageRow, stageIdx === i && s.stageRowOn]}
                  onPress={() => setStageIdx(i)}
                  testID={`stage-${i}`}
                >
                  <View>
                    <Text style={[s.stageName, stageIdx === i && { color: "#fff" }]}>{st.name.toUpperCase()} ({st.duration_days}d)</Text>
                    <Text style={[s.stageRange, stageIdx === i && { color: "#E6E9D6" }]}>
                      pH {st.ph_min}–{st.ph_max} · EC {st.ec_min}–{st.ec_max} · T {st.temp_min}–{st.temp_max}°C
                    </Text>
                  </View>
                  {stageIdx === i && <Ionicons name="checkmark-circle" size={22} color="#fff" />}
                </TouchableOpacity>
              ))}
            </>
          )}

          <TouchableOpacity style={[s.save, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} testID="assign-save">
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Save assignment</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({label,v,setV,mi,setMi,ma,setMa,ok,tid}:any){
  const bad=v&&!ok;
  return (
    <View style={{marginBottom:S.md}}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        <TextInput testID={`${tid}-val`} style={[s.input,{flex:2},bad&&s.bad]} value={v} onChangeText={setV} keyboardType="decimal-pad" placeholder="Actual" placeholderTextColor={C.textMuted}/>
        <TextInput style={[s.input,{flex:1}]} value={mi} onChangeText={setMi} keyboardType="decimal-pad" placeholder="Min" placeholderTextColor={C.textMuted}/>
        <TextInput style={[s.input,{flex:1}]} value={ma} onChangeText={setMa} keyboardType="decimal-pad" placeholder="Max" placeholderTextColor={C.textMuted}/>
      </View>
      {v?(
        <View style={[s.badge,{backgroundColor:ok?"#E8F6E8":"#FCE4E1"}]}>
          <Ionicons name={ok?"checkmark-circle":"alert-circle"} size={12} color={ok?C.success:C.danger}/>
          <Text style={[s.badgeText,{color:ok?C.success:C.danger}]}>{ok?"In range":"Out of range"}</Text>
        </View>
      ):null}
    </View>
  );
}

const s = StyleSheet.create({
  c:{flex:1,backgroundColor:C.bg},
  head:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:S.md,borderBottomWidth:1,borderBottomColor:C.border,gap:8},
  headIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  title:{fontSize:17,fontWeight:"700",color:C.text,flex:1,textAlign:"center"},
  helper: { fontSize: 12, color: C.text2, marginBottom: S.md, lineHeight: 18 },
  label:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:2,marginTop:S.md,marginBottom:6},
  row:{flexDirection:"row",gap:8,flexWrap:"wrap"},
  chip:{flexDirection:"row",alignItems:"center",gap:4,paddingHorizontal:14,paddingVertical:10,backgroundColor:C.card,borderRadius:12,borderWidth:1,borderColor:C.border},
  chipOn:{backgroundColor:C.brand,borderColor:C.brand},
  chipText:{fontWeight:"700",color:C.text,fontSize:12,letterSpacing:1},
  bigChip: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  bigChipOn: { backgroundColor: C.brand, borderColor: C.brand },
  bigChipText: { fontWeight: "700", color: C.text, fontSize: 13 },
  stageRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  stageRowOn: { backgroundColor: C.brand, borderColor: C.brand },
  stageName: { fontSize: 14, fontWeight: "700", color: C.text },
  stageRange: { fontSize: 11, color: C.text2, marginTop: 4 },
  cropCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#EFF3DC", borderWidth: 1, borderColor: "#D9DFB8", borderRadius: 14, padding: 12, marginTop: S.md },
  cropTitle: { fontSize: 14, fontWeight: "800", color: C.text },
  cropSub: { fontSize: 11, color: C.text2, marginTop: 2 },
  input:{backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,fontSize:15,color:C.text},
  bad:{borderColor:C.danger,backgroundColor:"#FFF6F5"},
  badge:{flexDirection:"row",alignItems:"center",gap:4,alignSelf:"flex-start",paddingHorizontal:8,paddingVertical:4,borderRadius:6,marginTop:6},
  badgeText:{fontSize:11,fontWeight:"700"},
  notes:{backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,minHeight:60,color:C.text},
  save:{backgroundColor:C.brand,borderRadius:16,paddingVertical:16,alignItems:"center",marginTop:S.lg},
  saveText:{color:"#fff",fontWeight:"700",fontSize:16},
  editBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF4EC", borderColor: "#F0D6BE", borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  editBannerText: { flex: 1, fontSize: 12, fontWeight: "700", color: C.accent },
  cancelEdit: { fontSize: 12, fontWeight: "700", color: C.danger },
});
