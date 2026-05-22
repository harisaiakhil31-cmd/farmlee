import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, Alert, ImageBackground, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { C, S } from "../src/theme";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("akhilharisai@gmail.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) return Alert.alert("Required", "Enter email and password");
    setLoading(true);
    try {
      const r = await api.post("/auth/login", { email: email.trim().toLowerCase(), password });
      router.push({
        pathname: "/verify-otp",
        params: { email: email.trim().toLowerCase(), dev_otp: r.data.dev_otp || "" },
      });
    } catch (e: any) {
      Alert.alert("Login failed", e?.response?.data?.detail || "Try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: "https://images.unsplash.com/photo-1608101913822-5343e10fceba?crop=entropy&cs=srgb&fm=jpg&w=1200&q=70" }}
      style={styles.bg}
      blurRadius={2}
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
      >
        <View style={styles.card} testID="login-card">
          <View style={styles.logoWrap}>
            <View style={styles.logo}><Ionicons name="leaf" size={28} color="#fff" /></View>
            <Text style={styles.brand}>Farmlee Manager</Text>
            <Text style={styles.tagline}>Hydroponic farm operations · Daily control</Text>
          </View>

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            testID="login-email"
            value={email} onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address" autoCapitalize="none"
            placeholderTextColor={C.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            testID="login-password"
            value={password} onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            placeholderTextColor={C.textMuted}
            style={styles.input}
          />

          <TouchableOpacity
            testID="login-submit-btn"
            onPress={onSubmit}
            style={styles.btn}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> :
              <>
                <Text style={styles.btnText}>Sign in with 2FA</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>}
          </TouchableOpacity>

          <TouchableOpacity
            testID="login-forgot-btn"
            onPress={() => router.push("/forgot-password")}
            style={styles.forgot}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>A 6-digit code will be sent to your email.</Text>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(27,46,28,0.45)" },
  kav: { flex: 1, justifyContent: "flex-end", padding: S.lg },
  card: {
    backgroundColor: C.card, borderRadius: 28, padding: S.lg, paddingTop: S.xl,
    borderWidth: 1, borderColor: C.border, marginBottom: S.lg,
  },
  logoWrap: { alignItems: "center", marginBottom: S.lg },
  logo: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: C.brand,
    alignItems: "center", justifyContent: "center", marginBottom: S.sm,
  },
  brand: { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: C.text2, marginTop: 4 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 2, color: C.text2, marginTop: S.md, marginBottom: 6 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 14,
    paddingHorizontal: S.md, paddingVertical: 14, fontSize: 16, color: C.text,
  },
  btn: {
    marginTop: S.lg, backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  hint: { textAlign: "center", marginTop: S.md, color: C.textMuted, fontSize: 12 },
  forgot: { alignSelf: "center", marginTop: S.md, padding: 6 },
  forgotText: { color: C.accent, fontSize: 13, fontWeight: "700" },
});
