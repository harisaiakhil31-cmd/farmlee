import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, clearSession, getUser } from "../../src/api";
import { C, S } from "../../src/theme";

// Cross-platform confirm (Alert.alert callbacks don't fire on react-native-web)
const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: "destructive", onPress: onConfirm },
    ]);
  }
};

export default function ProfileTab() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  const load = useCallback(async () => {
    const u = await getUser();
    setUser(u);
    if (u?.role === "admin") {
      try {
        const r = await api.get("/users");
        setUsers(r.data);
      } catch (err) {
        console.error("Users load failed:", err);
      }
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onLogout = () =>
    confirmAction("Sign out?", "You will be signed out and need to enter your password + OTP again.",
      async () => { await clearSession(); router.replace("/login"); });

  const onRemove = (uid: string) =>
    confirmAction("Remove user?", "This user will lose access to Farmlee Manager.",
      async () => { await api.delete(`/users/${uid}`); load(); });

  return (
    <SafeAreaView style={styles.c} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>PROFILE</Text>
        <Text style={styles.title}>Account</Text>

        <View style={styles.userCard} testID="profile-user-card">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={[styles.roleBadge, { backgroundColor: user?.role === "admin" ? C.brand : C.bg2 }]}>
              <Text style={[styles.roleText, { color: user?.role === "admin" ? "#fff" : C.text }]}>
                {user?.role?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {user?.role === "admin" && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>TEAM ({users.length}/3)</Text>
              {users.length < 3 && (
                <TouchableOpacity
                  style={styles.inviteBtn}
                  onPress={() => router.push("/invite-user")}
                  testID="invite-btn"
                >
                  <Ionicons name="person-add" size={14} color="#fff" />
                  <Text style={styles.inviteText}>Invite</Text>
                </TouchableOpacity>
              )}
            </View>

            {users.map((u) => (
              <View key={u.id} style={styles.userRow} testID={`team-${u.id}`}>
                <View style={[styles.avatar, { width: 38, height: 38 }]}>
                  <Text style={styles.avatarTextSm}>{u.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{u.name} {u.role === "admin" ? "(you)" : ""}</Text>
                  <Text style={styles.rowEmail}>{u.email}</Text>
                </View>
                {u.role !== "admin" && (
                  <TouchableOpacity onPress={() => onRemove(u.id)}>
                    <Ionicons name="close-circle" size={22} color={C.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        <Text style={styles.section}>SECURITY</Text>
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={22} color={C.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Two-step verification</Text>
            <Text style={styles.infoSub}>Active · Email OTP enforced on every sign-in</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push("/change-password")}
          testID="change-password-btn"
        >
          <View style={styles.linkIcon}><Ionicons name="key-outline" size={20} color={C.brand} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Change password</Text>
            <Text style={styles.infoSub}>Update your sign-in password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.text2} />
        </TouchableOpacity>

        {user?.role === "admin" && (
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push("/checks/audit")}
            testID="audit-btn"
          >
            <View style={[styles.linkIcon, { backgroundColor: "#FFF4EC" }]}>
              <Ionicons name="receipt-outline" size={20} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Audit log</Text>
              <Text style={styles.infoSub}>Login history · admin only (extra OTP)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.text2} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logout} onPress={onLogout} testID="logout-btn">
          <Ionicons name="log-out-outline" size={20} color={C.danger} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: C.bg, padding: S.md },
  label: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, paddingTop: S.sm },
  title: { fontSize: 32, fontWeight: "800", color: C.text, marginTop: 4, letterSpacing: -0.5, marginBottom: S.md },
  userCard: { flexDirection: "row", gap: 16, alignItems: "center", backgroundColor: C.card, borderRadius: 24, padding: S.md, borderWidth: 1, borderColor: C.border },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  avatarTextSm: { color: "#fff", fontSize: 16, fontWeight: "800" },
  userName: { fontSize: 19, fontWeight: "700", color: C.text },
  userEmail: { fontSize: 13, color: C.text2, marginTop: 2 },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  roleText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: S.lg },
  section: { fontSize: 11, fontWeight: "700", color: C.text2, letterSpacing: 2, marginTop: S.lg, marginBottom: S.sm },
  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  inviteText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  rowName: { fontSize: 15, fontWeight: "600", color: C.text },
  rowEmail: { fontSize: 12, color: C.text2 },
  infoCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.border },
  infoTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  infoSub: { fontSize: 12, color: C.text2, marginTop: 2 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: 16, padding: S.md, borderWidth: 1, borderColor: C.border, marginTop: 8 },
  linkIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EFF3DC", alignItems: "center", justifyContent: "center" },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: S.lg, padding: S.md, borderRadius: 16, backgroundColor: "#FCE4E1" },
  logoutText: { color: C.danger, fontSize: 15, fontWeight: "700" },
});
