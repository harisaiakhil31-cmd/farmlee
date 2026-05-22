import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, setSession } from "../src/api";
import { C, S } from "../src/theme";

export default function VerifyOTP() {
  const router = useRouter();
  const { email, dev_otp } = useLocalSearchParams<{ email: string; dev_otp?: string }>();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const refs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (dev_otp && dev_otp.length === 6) {
      setCode(dev_otp.split(""));
    }
  }, [dev_otp]);

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(-1);
    const next = [...code];
    next[i] = d;
    setCode(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const onVerify = async () => {
    const otp = code.join("");
    if (otp.length !== 6) return Alert.alert("Required", "Enter 6-digit code");
    setLoading(true);
    try {
      const r = await api.post("/auth/verify-otp", { email, otp });
      await setSession(r.data.token, r.data.user);
      router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      Alert.alert("Invalid OTP", e?.response?.data?.detail || "Try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.c}
    >
      <TouchableOpacity onPress={() => router.back()} style={styles.back} testID="otp-back">
        <Ionicons name="arrow-back" size={22} color={C.text} />
      </TouchableOpacity>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark" size={32} color={C.brand} />
        </View>
        <Text style={styles.title}>Verify it's you</Text>
        <Text style={styles.sub}>We sent a 6-digit code to{"\n"}<Text style={{ color: C.text, fontWeight: "700" }}>{email}</Text></Text>

        {dev_otp ? (
          <View style={styles.devBanner} testID="dev-otp-banner">
            <Ionicons name="information-circle" size={14} color={C.accent} />
            <Text style={styles.devText}>Dev mode (no SendGrid key) — code: {dev_otp}</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          {code.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { refs.current[i] = r; }}
              testID={`otp-digit-${i}`}
              value={d}
              onChangeText={(v) => setDigit(i, v)}
              onKeyPress={(e) => {
                if (e.nativeEvent.key === "Backspace" && !code[i] && i > 0) refs.current[i - 1]?.focus();
              }}
              keyboardType="number-pad"
              maxLength={1}
              style={[styles.digit, d ? styles.digitFilled : null]}
            />
          ))}
        </View>

        <TouchableOpacity
          testID="otp-verify-btn"
          style={styles.btn}
          onPress={onVerify}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & continue</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg, padding: S.lg, paddingTop: 60 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg2, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, justifyContent: "center" },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: C.bg2,
    alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginBottom: S.lg,
  },
  title: { fontSize: 30, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: C.text2, marginTop: 8, lineHeight: 22 },
  devBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF4EC", padding: 10, borderRadius: 10, marginTop: S.md,
    borderWidth: 1, borderColor: "#F0D6BE",
  },
  devText: { fontSize: 12, color: C.accent, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10, marginTop: S.xl },
  digit: {
    flex: 1, height: 60, borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card, textAlign: "center", fontSize: 24, fontWeight: "700", color: C.text,
  },
  digitFilled: { borderColor: C.brand, backgroundColor: "#F5F7EC" },
  btn: {
    marginTop: S.xl, backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16,
    alignItems: "center", justifyContent: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
