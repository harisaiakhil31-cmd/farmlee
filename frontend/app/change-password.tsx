import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, clearSession } from "../src/api";
import { C, S } from "../src/theme";
import { PWD_RULES, isStrong } from "../src/password";

export default function ChangePassword() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showC, setShowC] = useState(false);
  const [showN, setShowN] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!current) return Alert.alert("Required", "Enter your current password");
    if (!isStrong(next)) return Alert.alert("Weak password", "Please meet all the requirements below.");
    if (next !== confirm) return Alert.alert("Mismatch", "New password and confirmation don't match");
    if (current === next) return Alert.alert("Same password", "New password must be different from the current one");
    setLoading(true);
    try {
      await api.post("/auth/change-password", { current_password: current, new_password: next });
      Alert.alert("Password updated", "For security, please sign in again with your new password.", [
        { text: "OK", onPress: async () => { await clearSession(); router.replace("/login"); } },
      ]);
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} testID="cp-back"><Ionicons name="arrow-back" size={24} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Change password</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={s.iconWrap}><Ionicons name="lock-closed" size={28} color={C.brand} /></View>
          <Text style={s.lead}>Update your password</Text>
          <Text style={s.sub}>Pick a strong password you don&apos;t use elsewhere.</Text>

          <Text style={s.label}>CURRENT PASSWORD</Text>
          <View style={s.inputRow}>
            <TextInput testID="cp-current" style={s.input} value={current} onChangeText={setCurrent}
              secureTextEntry={!showC} placeholder="" placeholderTextColor={C.textMuted} />
            <TouchableOpacity onPress={() => setShowC(!showC)} style={s.eye}><Ionicons name={showC?"eye-off":"eye"} size={20} color={C.text2}/></TouchableOpacity>
          </View>

          <Text style={s.label}>NEW PASSWORD</Text>
          <View style={s.inputRow}>
            <TextInput testID="cp-new" style={s.input} value={next} onChangeText={setNext}
              secureTextEntry={!showN} placeholder="" placeholderTextColor={C.textMuted} />
            <TouchableOpacity onPress={() => setShowN(!showN)} style={s.eye}><Ionicons name={showN?"eye-off":"eye"} size={20} color={C.text2}/></TouchableOpacity>
          </View>

          <Text style={s.label}>CONFIRM NEW PASSWORD</Text>
          <TextInput testID="cp-confirm" style={s.input} value={confirm} onChangeText={setConfirm}
            secureTextEntry={!showN} placeholder="" placeholderTextColor={C.textMuted} />

          <View style={s.rulesCard}>
            {PWD_RULES.map((r) => {
              const ok = r.test(next);
              return (
                <View key={r.key} style={s.ruleRow}>
                  <Ionicons name={ok ? "checkmark-circle" : "ellipse-outline"} size={16} color={ok ? C.brand : C.text2} />
                  <Text style={[s.ruleText, ok && { color: C.text, fontWeight: "700" }]}>{r.label}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity testID="cp-submit" style={[s.btn, loading && { opacity: 0.6 }]} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Update password</Text>}
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
  iconWrap:{width:56,height:56,borderRadius:18,backgroundColor:C.bg2,alignItems:"center",justifyContent:"center",marginBottom:S.md},
  lead:{fontSize:24,fontWeight:"800",color:C.text,letterSpacing:-0.5},
  sub:{fontSize:13,color:C.text2,marginTop:4,marginBottom:S.md},
  label:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:1.5,marginTop:S.md,marginBottom:6},
  inputRow:{flexDirection:"row",alignItems:"center",backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,borderRadius:14},
  input:{flex:1,paddingHorizontal:S.md,paddingVertical:14,fontSize:16,color:C.text,backgroundColor:C.inputBg,borderRadius:14},
  eye:{padding:12},
  rulesCard:{backgroundColor:C.card,borderRadius:14,padding:S.md,borderWidth:1,borderColor:C.border,marginTop:S.md,gap:6},
  ruleRow:{flexDirection:"row",alignItems:"center",gap:8},
  ruleText:{fontSize:13,color:C.text2},
  btn:{marginTop:S.lg,backgroundColor:C.brand,borderRadius:16,paddingVertical:16,alignItems:"center"},
  btnText:{color:"#fff",fontWeight:"700",fontSize:16},
});
