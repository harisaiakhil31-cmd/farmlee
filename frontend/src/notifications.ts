import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const r = await Notifications.requestPermissionsAsync();
      return r.status === "granted";
    }
    return true;
  } catch {
    return false;
  }
}

export async function scheduleLocalReminder(title: string, body: string, date: Date) {
  try {
    if (Platform.OS === "web") return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date } as any,
    });
    return id;
  } catch {
    return null;
  }
}
