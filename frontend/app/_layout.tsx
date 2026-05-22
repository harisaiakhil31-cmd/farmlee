import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({
    Ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="verify-otp" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="checks/tanks" options={{ presentation: "modal" }} />
          <Stack.Screen name="checks/environment" options={{ presentation: "modal" }} />
          <Stack.Screen name="checks/field" options={{ presentation: "modal" }} />
          <Stack.Screen name="checks/report" options={{ presentation: "modal" }} />
          <Stack.Screen name="checks/audit" options={{ presentation: "modal" }} />
          <Stack.Screen name="checks/weekly" options={{ presentation: "modal" }} />
          <Stack.Screen name="checks/monthly" options={{ presentation: "modal" }} />
          <Stack.Screen name="reminder-new" options={{ presentation: "modal" }} />
          <Stack.Screen name="crop-edit" options={{ presentation: "modal" }} />
          <Stack.Screen name="day-detail" options={{ presentation: "modal" }} />
          <Stack.Screen name="invite-user" options={{ presentation: "modal" }} />
          <Stack.Screen name="change-password" options={{ presentation: "modal" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
