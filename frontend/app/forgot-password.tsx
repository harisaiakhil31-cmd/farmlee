import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { C, S } from "../src/theme";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const e = email.trim().toLowerCase();
    if (!e) return Alert.alert("Required", "Enter your email address");
    setLoading(true);
    try {
      const r = await api.post("/auth/forgot-password", { email: e });
      router.push({ pathname: "/reset-password", params: { email: e, dev_otp: r.data.dev_otp || "" } });
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.detail || "Try again");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} testID="fp-back"><Ionicons name="arrow-back" size={24} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Forgot password</Text>
        <View style={{ width: 24 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={s.body}>
          <View style={s.iconWrap}><Ionicons name="mail-unread" size={28} color={C.accent} /></View>
          <Text style={s.lead}>Reset your password</Text>
          <Text style={s.sub}>Enter the email you signed up with. We&apos;ll send you a 6-digit code to verify it&apos;s you.</Text>

          <Text style={s.label}>EMAIL</Text>
          <TextInput
            testID="fp-email"
            style={s.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            placeholderTextColor={C.textMuted}
            autoFocus
          />

          <TouchableOpacity testID="fp-submit" style={[s.btn, loading && { opacity: 0.6 }]} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff"/> : <Text style={s.btnText}>Send reset code</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace("/login")} style={s.linkBtn}>
            <Text style={s.linkText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c:{flex:1,backgroundColor:C.bg},
  head:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",padding:S.md,borderBottomWidth:1,borderBottomColor:C.border},
  title:{fontSize:18,fontWeight:"700",color:C.text},
  body:{flex:1,padding:S.lg,justifyContent:"center"},
  iconWrap:{width:64,height:64,borderRadius:20,backgroundColor:"#FFF4EC",alignItems:"center",justifyContent:"center",marginBottom:S.md},
  lead:{fontSize:28,fontWeight:"800",color:C.text,letterSpacing:-0.5},
  sub:{fontSize:14,color:C.text2,lineHeight:20,marginTop:6},
  label:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:1.5,marginTop:S.lg,marginBottom:6},
  input:{backgroundColor:C.inputBg,borderWidth:1,borderColor:C.border,borderRadius:14,paddingHorizontal:S.md,paddingVertical:14,fontSize:16,color:C.text},
  btn:{marginTop:S.lg,backgroundColor:C.brand,borderRadius:16,paddingVertical:16,alignItems:"center"},
  btnText:{color:"#fff",fontWeight:"700",fontSize:16},
  linkBtn:{marginTop:S.md,alignItems:"center",padding:8},
  linkText:{color:C.text2,fontSize:13,fontWeight:"600"},
});
