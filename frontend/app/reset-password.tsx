import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { C, S } from "../src/theme";
import { PWD_RULES, isStrong } from "../src/password";

export default function ResetPassword() {
  const router = useRouter();
  const { email, dev_otp } = useLocalSearchParams<{ email: string; dev_otp?: string }>();
  const [code, setCode] = useState(["","","","","",""]);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const refs = useRef<Array<TextInput | null>>([]);

  useEffect(() => { if (dev_otp && dev_otp.length === 6) setCode(dev_otp.split("")); }, [dev_otp]);

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(-1);
    const arr = [...code]; arr[i] = d; setCode(arr);
    if (d && i < 5) refs.current[i+1]?.focus();
  };

  const resend = async () => {
    setResending(true);
    try {
      const r = await api.post("/auth/forgot-password", { email });
      if (r.data.dev_otp) setCode(r.data.dev_otp.split(""));
      Alert.alert("Code sent", "A new 6-digit code has been emailed.");
    } catch { Alert.alert("Error", "Could not resend code"); }
    finally { setResending(false); }
  };

  const onSubmit = async () => {
    const otp = code.join("");
    if (otp.length !== 6) return Alert.alert("Required", "Enter the 6-digit code");
    if (!isStrong(next)) return Alert.alert("Weak password", "Please meet all the requirements below.");
    if (next !== confirm) return Alert.alert("Mismatch", "Passwords don't match");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp, new_password: next });
      Alert.alert("Password reset", "You can now sign in with your new password.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} testID="rp-back"><Ionicons name="arrow-back" size={24} color={C.text}/></TouchableOpacity>
        <Text style={s.title}>Set new password</Text>
        <View style={{ width: 24 }}/>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={{flex:1}}>
        <ScrollView contentContainerStyle={{padding:S.md, paddingBottom:40}} keyboardShouldPersistTaps="handled">
          <Text style={s.sub}>We sent a 6-digit code to <Text style={{color:C.text,fontWeight:"700"}}>{email}</Text></Text>

          {dev_otp ? (
            <View style={s.devBanner}>
              <Ionicons name="information-circle" size={14} color={C.accent}/>
              <Text style={s.devText}>Dev mode — code: {dev_otp}</Text>
            </View>
          ) : null}

          <Text style={s.label}>VERIFICATION CODE</Text>
          <View style={s.codeRow}>
            {code.map((d,i) => (
              <TextInput key={i}
                ref={(r) => { refs.current[i] = r; }}
                testID={`rp-otp-${i}`}
                value={d}
                onChangeText={(v)=>setDigit(i,v)}
                onKeyPress={(e)=>{ if (e.nativeEvent.key === "Backspace" && !code[i] && i>0) refs.current[i-1]?.focus(); }}
                keyboardType="number-pad"
                maxLength={1}
                style={[s.digit, d && s.digitFilled]}/>
            ))}
          </View>
          <TouchableOpacity onPress={resend} disabled={resending} style={{alignSelf:"flex-end",padding:6}}>
            <Text style={s.resend}>{resending ? "Sending..." : "Resend code"}</Text>
          </TouchableOpacity>

          <Text style={s.label}>NEW PASSWORD</Text>
          <View style={s.inputRow}>
            <TextInput testID="rp-new" style={s.input} value={next} onChangeText={setNext}
              secureTextEntry={!show} placeholder="" placeholderTextColor={C.textMuted}/>
            <TouchableOpacity onPress={()=>setShow(!show)} style={s.eye}>
              <Ionicons name={show?"eye-off":"eye"} size={20} color={C.text2}/>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>CONFIRM PASSWORD</Text>
          <TextInput testID="rp-confirm" style={s.input} value={confirm} onChangeText={setConfirm}
            secureTextEntry={!show} placeholder="" placeholderTextColor={C.textMuted}/>

          <View style={s.rulesCard}>
            {PWD_RULES.map((r) => {
              const ok = r.test(next);
              return (
                <View key={r.key} style={s.ruleRow}>
                  <Ionicons name={ok?"checkmark-circle":"ellipse-outline"} size={16} color={ok?C.brand:C.text2}/>
                  <Text style={[s.ruleText, ok && {color:C.text,fontWeight:"700"}]}>{r.label}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity testID="rp-submit" style={[s.btn, loading && {opacity:0.6}]} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff"/> : <Text style={s.btnText}>Reset password</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c:{flex:1,backgroundColor:C.bg},
  head:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:S.md,borderBottomWidth:1,borderBottomColor:C.border},
  title:{fontSize:18,fontWeight:"700",color:C.text},
  sub:{fontSize:14,color:C.text2,lineHeight:20,marginTop:4},
  devBanner:{flexDirection:"row",alignItems:"center",gap:6,backgroundColor:"#FFF4EC",padding:10,borderRadius:10,marginTop:S.md,borderWidth:1,borderColor:"#F0D6BE"},
  devText:{fontSize:12,color:C.accent,fontWeight:"600"},
  label:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:1.5,marginTop:S.lg,marginBottom:6},
  codeRow:{flexDirection:"row",gap:8},
  digit:{flex:1,height:54,borderRadius:12,borderWidth:1.5,borderColor:C.border,backgroundColor:C.card,textAlign:"center",fontSize:22,fontWeight:"700",color:C.text},
  digitFilled:{borderColor:C.brand,backgroundColor:"#F5F7EC"},
  resend:{color:C.accent,fontSize:13,fontWeight:"700"},
  inputRow:{flexDirection:"row",alignItems:"center",backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,borderRadius:14},
  input:{flex:1,paddingHorizontal:S.md,paddingVertical:14,fontSize:16,color:C.text,backgroundColor:C.inputBg,borderRadius:14},
  eye:{padding:12},
  rulesCard:{backgroundColor:C.card,borderRadius:14,padding:S.md,borderWidth:1,borderColor:C.border,marginTop:S.md,gap:6},
  ruleRow:{flexDirection:"row",alignItems:"center",gap:8},
  ruleText:{fontSize:13,color:C.text2},
  btn:{marginTop:S.lg,backgroundColor:C.brand,borderRadius:16,paddingVertical:16,alignItems:"center"},
  btnText:{color:"#fff",fontWeight:"700",fontSize:16},
});
