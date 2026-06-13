import { Alert, Platform } from "react-native";

/**
 * Cross-platform confirm dialog.
 * On react-native-web, Alert.alert callbacks do NOT fire — we fall back to window.confirm().
 * On native iOS/Android, uses standard Alert.alert.
 */
export const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void,
  destructive: boolean = true
) => {
  if (Platform.OS === "web") {
    const msg = message ? `${title}\n\n${message}` : title;
    if (typeof window !== "undefined" && window.confirm(msg)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: destructive ? "Delete" : "OK", style: destructive ? "destructive" : "default", onPress: onConfirm },
    ]);
  }
};

/**
 * Cross-platform success alert. On web uses window.alert.
 */
export const notify = (title: string, message?: string) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};
