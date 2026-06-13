import { Platform, TextInput, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useState } from "react";
import { C } from "./theme";

/**
 * Cross-platform date + time picker.
 * On web, renders native HTML datetime-local input.
 * On iOS/Android, renders @react-native-community/datetimepicker.
 */
export function WebDateTime({ value, onChange, minimum, testID }: { value: Date; onChange: (d: Date) => void; minimum?: Date; testID?: string; }) {
  if (Platform.OS === "web") {
    // Format for HTML input: yyyy-MM-ddTHH:mm
    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const min = minimum ? fmt(minimum) : undefined;
    return (
      <View style={s.webBox}>
        <Ionicons name="calendar" size={18} color={C.text} />
        {/* @ts-expect-error html input on web */}
        <input
          type="datetime-local"
          value={fmt(value)}
          min={min}
          onChange={(e: any) => {
            const v = e.target.value;
            if (v) onChange(new Date(v));
          }}
          data-testid={testID}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: C.text,
            fontSize: 14,
            fontWeight: 600,
            paddingLeft: 8,
            fontFamily: "inherit",
          }}
        />
      </View>
    );
  }

  // Native fallback (iOS/Android): two buttons for date + time
  return <NativeDateTime value={value} onChange={onChange} minimum={minimum} testID={testID} />;
}

function NativeDateTime({ value, onChange, minimum, testID }: any) {
  const [showD, setShowD] = useState(false);
  const [showT, setShowT] = useState(false);
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <TouchableOpacity style={s.btn} onPress={() => setShowD(true)} testID={`${testID}-date`}>
        <Ionicons name="calendar-outline" size={18} color={C.text} />
        <Text style={s.text}>{format(value, "MMM d, yyyy")}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.btn} onPress={() => setShowT(true)} testID={`${testID}-time`}>
        <Ionicons name="time-outline" size={18} color={C.text} />
        <Text style={s.text}>{format(value, "h:mm a")}</Text>
      </TouchableOpacity>
      {showD && (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={minimum}
          onChange={(_, d: any) => {
            setShowD(false);
            if (d) onChange(new Date(d.getFullYear(), d.getMonth(), d.getDate(), value.getHours(), value.getMinutes()));
          }}
        />
      )}
      {showT && (
        <DateTimePicker
          value={value}
          mode="time"
          onChange={(_, d: any) => {
            setShowT(false);
            if (d) onChange(new Date(value.getFullYear(), value.getMonth(), value.getDate(), d.getHours(), d.getMinutes()));
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  webBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: C.card, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, gap: 8,
  },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  text: { fontSize: 14, fontWeight: "600", color: C.text },
});

/**
 * Cross-platform plain date picker (no time).
 */
export function WebDate({ value, onChange, minimum, testID }: any) {
  if (Platform.OS === "web") {
    const fmt = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    return (
      <View style={s.webBox}>
        <Ionicons name="calendar" size={18} color={C.text} />
        {/* @ts-expect-error html input on web */}
        <input
          type="date"
          value={fmt(value)}
          min={minimum ? fmt(minimum) : undefined}
          onChange={(e: any) => { if (e.target.value) onChange(new Date(e.target.value)); }}
          data-testid={testID}
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            color: C.text, fontSize: 14, fontWeight: 600, paddingLeft: 8, fontFamily: "inherit",
          }}
        />
      </View>
    );
  }
  return <NativeDateTime value={value} onChange={onChange} minimum={minimum} testID={testID} />;
}
