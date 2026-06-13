import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
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
          <Stack.Screen name="seedling-new" options={{ presentation: "modal" }} />
          <Stack.Screen name="seedling-batch" options={{ presentation: "modal" }} />
          <Stack.Screen name="seedling-types" options={{ presentation: "modal" }} />
          <Stack.Screen name="trash" options={{ presentation: "modal" }} />
          <Stack.Screen name="inventory" options={{ presentation: "modal" }} />
          <Stack.Screen name="inventory-edit" options={{ presentation: "modal" }} />
          <Stack.Screen name="rows" options={{ presentation: "modal" }} />
          <Stack.Screen name="tower-detail" options={{ presentation: "modal" }} />
          <Stack.Screen name="environment-history" options={{ presentation: "modal" }} />
          <Stack.Screen name="tasks-manage" options={{ presentation: "modal" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
