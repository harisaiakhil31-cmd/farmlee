import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getToken } from "../src/api";
import { C } from "../src/theme";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) router.replace("/(tabs)/dashboard");
      else router.replace("/login");
    })();
  }, []);
  return (
    <View style={styles.c} testID="splash">
      <ActivityIndicator size="large" color={C.brand} />
    </View>
  );
}
const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
});
