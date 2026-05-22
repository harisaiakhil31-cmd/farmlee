import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          height: 76,
          paddingTop: 8,
          paddingBottom: 18,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="dashboard" options={{
        title: "Home",
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="calendar" options={{
        title: "Calendar",
        tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
      }} />
      <Tabs.Screen name="seedlings" options={{
        title: "Seedlings",
        tabBarIcon: ({ color, size }) => <Ionicons name="flower" size={size} color={color} />,
      }} />
      <Tabs.Screen name="crops" options={{
        title: "Crops",
        tabBarIcon: ({ color, size }) => <Ionicons name="leaf" size={size} color={color} />,
      }} />
      <Tabs.Screen name="reminders" options={{
        title: "Reminders",
        tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: "Profile",
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
