import { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";

export default function AuditLog() {
  const router = useRouter();
  const [step, setStep] = useState<"request"|"verify"|"view">("request");
  const [otp, setOtp] = useState(""); const [devOtp, setDevOtp] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const requestOtp = async () => {
    setLoading(true);
    try {
      const r = await api.post("/admin/audit/request-otp");
      if (r.data.dev_otp) setDevOtp(r.data.dev_otp);
      setStep("verify");
    } catch (e: any) { Alert.alert("Error", e?.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    if (otp.length !== 6) return Alert.alert("Required", "Enter 6-digit code");
    setLoading(true);
    try {
      const r = await api.post("/admin/audit/verify", { otp });
      setLogs(r.data.logs); setStep("view");
    } catch (e: any) { Alert.alert("Invalid OTP", e?.response?.data?.detail || "Try again"); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Audit log (admin)</Text>
        <View style={{width:26}}/>
      </View>

      {step === "request" && (
        <View style={s.center}>
          <Ionicons name="shield-checkmark" size={48} color={C.brand}/>
          <Text style={s.bigTitle}>Secure access</Text>
          <Text style={s.bigSub}>Sensitive audit data. We'll email a 6-digit code to your admin address before showing the log.</Text>
          <TouchableOpacity style={s.cta} onPress={requestOtp} disabled={loading} testID="audit-request">
            {loading ? <ActivityIndicator color="#fff"/> : <Text style={s.ctaText}>Send code to admin email</Text>}
          </TouchableOpacity>
        </View>
      )}

      {step === "verify" && (
        <View style={s.center}>
          <Ionicons name="key" size={40} color={C.accent}/>
          <Text style={s.bigTitle}>Enter code</Text>
          <Text style={s.bigSub}>Check your email for the 6-digit audit access code.</Text>
          {devOtp ? <Text style={s.dev}>Dev mode code: {devOtp}</Text> : null}
          <TextInput testID="audit-otp" style={s.otpInput} value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor={C.textMuted}/>
          <TouchableOpacity style={s.cta} onPress={verify} disabled={loading} testID="audit-verify">
            {loading ? <ActivityIndicator color="#fff"/> : <Text style={s.ctaText}>Verify & view log</Text>}
          </TouchableOpacity>
        </View>
      )}

      {step === "view" && (
        <ScrollView contentContainerStyle={{padding:S.md}}>
          <Text style={s.section}>LATEST LOGINS ({logs.length})</Text>
          {logs.map((l: any) => (
            <View key={l.id} style={s.row}>
              <View style={s.avatar}><Ionicons name="person" size={18} color={C.brand}/></View>
              <View style={{flex:1}}>
                <Text style={s.rowName}>{l.user_name}</Text>
                <Text style={s.rowEmail}>{l.email}</Text>
                <Text style={s.rowMeta}>{format(new Date(l.logged_in_at),"MMM d, h:mm a")} · {l.device}</Text>
                <Text style={s.rowUA} numberOfLines={1}>{l.user_agent}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c:{flex:1,backgroundColor:C.bg},
  head:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:S.md,borderBottomWidth:1,borderBottomColor:C.border},
  title:{fontSize:18,fontWeight:"700",color:C.text},
  center:{flex:1,padding:S.lg,alignItems:"center",justifyContent:"center"},
  bigTitle:{fontSize:24,fontWeight:"800",color:C.text,marginTop:S.md,letterSpacing:-0.5},
  bigSub:{fontSize:14,color:C.text2,textAlign:"center",marginTop:8,maxWidth:300,lineHeight:20},
  cta:{backgroundColor:C.brand,paddingHorizontal:24,paddingVertical:14,borderRadius:14,marginTop:S.lg,minWidth:240,alignItems:"center"},
  ctaText:{color:"#fff",fontWeight:"700",fontSize:15},
  dev:{color:C.accent,fontSize:13,fontWeight:"700",marginTop:8},
  otpInput:{backgroundColor:C.card,borderWidth:2,borderColor:C.border,borderRadius:14,padding:14,fontSize:24,letterSpacing:6,textAlign:"center",color:C.text,minWidth:220,marginTop:S.md},
  section:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:2,marginBottom:S.sm},
  row:{flexDirection:"row",gap:12,backgroundColor:C.card,borderRadius:14,padding:S.md,borderWidth:1,borderColor:C.border,marginBottom:8},
  avatar:{width:40,height:40,borderRadius:12,backgroundColor:"#EFF3DC",alignItems:"center",justifyContent:"center"},
  rowName:{fontSize:14,fontWeight:"700",color:C.text},
  rowEmail:{fontSize:12,color:C.text2,marginTop:1},
  rowMeta:{fontSize:11,color:C.accent,fontWeight:"600",marginTop:4},
  rowUA:{fontSize:10,color:C.textMuted,marginTop:2},
});
