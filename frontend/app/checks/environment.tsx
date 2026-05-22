import { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";

export default function Environment() {
  const router = useRouter();
  const [session, setSession] = useState<"morning"|"afternoon"|"evening">("morning");
  const [temp, setTemp] = useState("");
  const [hum, setHum] = useState("");
  const [notes, setNotes] = useState("");
  const [avg, setAvg] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await api.get("/environment/reading", { params: { date: format(new Date(), "yyyy-MM-dd") } });
    setList(r.data.items || []); setAvg(r.data.average);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const save = async () => {
    if (!temp || !hum) return Alert.alert("Required", "Enter temperature and humidity");
    setSaving(true);
    try {
      const now = new Date();
      await api.post("/environment/reading", {
        check_date: format(now, "yyyy-MM-dd"), check_time: format(now, "HH:mm"),
        session, temperature: parseFloat(temp), humidity: parseFloat(hum), notes,
      });
      setTemp(""); setHum(""); setNotes("");
      await load();
    } catch (e: any) { Alert.alert("Failed", e?.response?.data?.detail || "Try again"); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Environment (Unit)</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{flex:1}}>
        <ScrollView contentContainerStyle={{padding:S.md}}>
          <Text style={s.label}>SESSION</Text>
          <View style={s.row}>
            {(["morning","afternoon","evening"] as const).map(x => (
              <TouchableOpacity key={x} style={[s.chip, session===x && s.chipOn]} onPress={()=>setSession(x)} testID={`env-${x}`}>
                <Text style={[s.chipText, session===x && {color:"#fff"}]}>{x.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>TEMPERATURE (°C)</Text>
          <TextInput testID="env-temp" style={s.input} value={temp} onChangeText={setTemp} keyboardType="decimal-pad" placeholder="e.g. 24.5" placeholderTextColor={C.textMuted}/>
          <Text style={s.label}>HUMIDITY (%)</Text>
          <TextInput testID="env-hum" style={s.input} value={hum} onChangeText={setHum} keyboardType="decimal-pad" placeholder="e.g. 65" placeholderTextColor={C.textMuted}/>
          <Text style={s.label}>NOTES</Text>
          <TextInput style={[s.input,{minHeight:60}]} value={notes} onChangeText={setNotes} multiline placeholder="Optional" placeholderTextColor={C.textMuted}/>

          <TouchableOpacity style={s.save} onPress={save} disabled={saving} testID="env-save">
            <Text style={s.saveText}>{saving ? "Saving..." : `Save ${session} reading`}</Text>
          </TouchableOpacity>

          <Text style={s.label}>TODAY'S READINGS ({list.length})</Text>
          {list.length === 0 && <Text style={s.muted}>No readings yet today</Text>}
          {list.map(r => (
            <View key={r.id} style={s.card}>
              <Text style={s.cardTitle}>{r.session.toUpperCase()} · {r.check_time}</Text>
              <Text style={s.cardBody}>Temp: {r.temperature}°C · Humidity: {r.humidity}%</Text>
              <Text style={s.cardMuted}>by {r.user_name}</Text>
            </View>
          ))}

          {avg && (
            <View style={s.avgCard}>
              <Text style={s.avgLabel}>DAILY AVERAGE ({avg.count} readings)</Text>
              <View style={{flexDirection:"row",gap:24,marginTop:8}}>
                <View><Text style={s.avgStat}>{avg.temperature}°C</Text><Text style={s.avgSub}>Avg temperature</Text></View>
                <View><Text style={s.avgStat}>{avg.humidity}%</Text><Text style={s.avgSub}>Avg humidity</Text></View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c:{flex:1,backgroundColor:C.bg},
  head:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:S.md,borderBottomWidth:1,borderBottomColor:C.border},
  title:{fontSize:18,fontWeight:"700",color:C.text},
  label:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:2,marginTop:S.md,marginBottom:6},
  row:{flexDirection:"row",gap:8,flexWrap:"wrap"},
  chip:{paddingHorizontal:14,paddingVertical:10,backgroundColor:C.card,borderRadius:12,borderWidth:1,borderColor:C.border},
  chipOn:{backgroundColor:C.brand,borderColor:C.brand},
  chipText:{fontWeight:"700",color:C.text,fontSize:12,letterSpacing:1},
  input:{backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,borderRadius:12,padding:14,fontSize:15,color:C.text},
  save:{backgroundColor:C.brand,borderRadius:16,paddingVertical:16,alignItems:"center",marginTop:S.lg},
  saveText:{color:"#fff",fontWeight:"700",fontSize:16},
  muted:{color:C.textMuted,fontSize:13,padding:8},
  card:{backgroundColor:C.card,borderRadius:14,padding:S.md,borderWidth:1,borderColor:C.border,marginBottom:8},
  cardTitle:{fontSize:13,fontWeight:"700",color:C.text,letterSpacing:1},
  cardBody:{fontSize:14,color:C.text2,marginTop:4},
  cardMuted:{fontSize:11,color:C.textMuted,marginTop:4},
  avgCard:{backgroundColor:C.brand,borderRadius:18,padding:S.md,marginTop:S.md},
  avgLabel:{fontSize:11,fontWeight:"800",color:"#D6DBC4",letterSpacing:2},
  avgStat:{fontSize:34,fontWeight:"800",color:"#fff",letterSpacing:-1},
  avgSub:{fontSize:11,color:"#D6DBC4",marginTop:2},
});
