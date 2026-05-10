import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../src/api";
import { C, S } from "../src/theme";

export default function InviteUser() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim() || !email.trim() || !pwd) return Alert.alert("Required", "Fill all fields");
    if (pwd.length < 6) return Alert.alert("Weak", "Password must be at least 6 characters");
    setLoading(true);
    try {
      await api.post("/users/invite", { name: name.trim(), email: email.trim().toLowerCase(), password: pwd });
      Alert.alert("Invited", `${name} can now sign in. Credentials emailed.`);
      router.back();
    } catch (e: any) {
      Alert.alert("Failed", e?.response?.data?.detail || "Try again");
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <View style={styles.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={styles.title}>Invite team member</Text>
        <View style={{ width: 26 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: S.md }}>
          <Text style={styles.hint}>Maximum 3 users (including you). New members will receive credentials by email.</Text>

          <Text style={styles.label}>NAME</Text>
          <TextInput testID="inv-name" style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={C.textMuted} />
          <Text style={styles.label}>EMAIL</Text>
          <TextInput testID="inv-email" style={styles.input} value={email} onChangeText={setEmail} placeholder="work@example.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={C.textMuted} />
          <Text style={styles.label}>TEMPORARY PASSWORD</Text>
          <TextInput testID="inv-pwd" style={styles.input} value={pwd} onChangeText={setPwd} placeholder="Min 6 characters" secureTextEntry placeholderTextColor={C.textMuted} />

          <TouchableOpacity style={styles.save} onPress={save} disabled={loading} testID="inv-save">
            <Text style={styles.saveText}>{loading ? "Sending invite..." : "Send invite"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: S.md, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: "700", color: C.text },
  hint: { fontSize: 13, color: C.text2, marginTop: S.md, lineHeight: 20 },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.md, marginBottom: 6 },
  input: { backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 15, color: C.text },
  save: { backgroundColor: C.brand, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: S.lg },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
