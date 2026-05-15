import { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";

export default function TankReading() {
  const router = useRouter();
  const [tank, setTank] = useState(1);
  const [session, setSession] = useState<"morning" | "evening">("morning");
  const [ph, setPh] = useState(""); const [phMin, setPhMin] = useState("5.5"); const [phMax, setPhMax] = useState("6.5");
  const [ec, setEc] = useState(""); const [ecMin, setEcMin] = useState("1.2"); const [ecMax, setEcMax] = useState("2.5");
  const [temp, setTemp] = useState(""); const [tMin, setTMin] = useState("18"); const [tMax, setTMax] = useState("26");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const ok = (v: string, mi: string, ma: string) => {
    const n = parseFloat(v); if (isNaN(n)) return true;
    return n >= parseFloat(mi) && n <= parseFloat(ma);
  };

  const save = async () => {
    if (!ph || !ec || !temp) return Alert.alert("Required", "Enter pH, EC and Temperature");
    setSaving(true);
    try {
      const now = new Date();
      await api.post("/tanks/reading", {
        check_date: format(now, "yyyy-MM-dd"), check_time: format(now, "HH:mm"),
        session, tank_id: tank,
        ph_actual: parseFloat(ph), ph_target_min: parseFloat(phMin), ph_target_max: parseFloat(phMax),
        ec_actual: parseFloat(ec), ec_target_min: parseFloat(ecMin), ec_target_max: parseFloat(ecMax),
        temp_actual: parseFloat(temp), temp_target_min: parseFloat(tMin), temp_target_max: parseFloat(tMax),
        notes,
      });
      Alert.alert("Saved", `Tank ${tank} (${session}) recorded`); router.back();
    } catch (e: any) { Alert.alert("Failed", e?.response?.data?.detail || "Try again"); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Tank reading</Text>
        <View style={{ width: 26 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md }}>
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

          <Field label="pH" v={ph} setV={setPh} mi={phMin} setMi={setPhMin} ma={phMax} setMa={setPhMax} ok={ok(ph,phMin,phMax)} tid="ph"/>
          <Field label="EC (mS/cm)" v={ec} setV={setEc} mi={ecMin} setMi={setEcMin} ma={ecMax} setMa={setEcMax} ok={ok(ec,ecMin,ecMax)} tid="ec"/>
          <Field label="Temperature (°C)" v={temp} setV={setTemp} mi={tMin} setMi={setTMin} ma={tMax} setMa={setTMax} ok={ok(temp,tMin,tMax)} tid="temp"/>

          <Text style={s.label}>NOTES</Text>
          <TextInput style={s.notes} value={notes} onChangeText={setNotes} multiline placeholder="Optional" placeholderTextColor={C.textMuted}/>

          <TouchableOpacity style={s.save} onPress={save} disabled={saving} testID="tank-save">
            <Text style={s.saveText}>{saving ? "Saving..." : `Save Tank ${tank} (${session})`}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  head:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:S.md,borderBottomWidth:1,borderBottomColor:C.border},
  title:{fontSize:18,fontWeight:"700",color:C.text},
  label:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:2,marginTop:S.md,marginBottom:6},
  row:{flexDirection:"row",gap:8,flexWrap:"wrap"},
  chip:{flexDirection:"row",alignItems:"center",gap:4,paddingHorizontal:14,paddingVertical:10,backgroundColor:C.card,borderRadius:12,borderWidth:1,borderColor:C.border},
  chipOn:{backgroundColor:C.brand,borderColor:C.brand},
  chipText:{fontWeight:"700",color:C.text,fontSize:12,letterSpacing:1},
  input:{backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,fontSize:15,color:C.text},
  bad:{borderColor:C.danger,backgroundColor:"#FFF6F5"},
  badge:{flexDirection:"row",alignItems:"center",gap:4,alignSelf:"flex-start",paddingHorizontal:8,paddingVertical:4,borderRadius:6,marginTop:6},
  badgeText:{fontSize:11,fontWeight:"700"},
  notes:{backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,borderRadius:12,padding:12,minHeight:60,color:C.text},
  save:{backgroundColor:C.brand,borderRadius:16,paddingVertical:16,alignItems:"center",marginTop:S.lg},
  saveText:{color:"#fff",fontWeight:"700",fontSize:16},
});
