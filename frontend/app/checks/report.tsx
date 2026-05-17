import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays, subMonths,
} from "date-fns";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";

type ReportKey = "tanks" | "environment" | "field" | "weekly" | "monthly";
const REPORTS: { key: ReportKey; label: string; icon: any; color: string }[] = [
  { key: "tanks",       label: "Tank readings",     icon: "water",            color: "#A5C45A" },
  { key: "environment", label: "Environment",       icon: "thermometer",      color: "#CC7753" },
  { key: "field",       label: "Field tasks",       icon: "leaf",             color: "#4A5D23" },
  { key: "weekly",      label: "Weekly checks",     icon: "calendar",         color: "#32ADE6" },
  { key: "monthly",     label: "Monthly checks",    icon: "calendar-outline", color: "#7E5BEF" },
];

type Preset = { label: string; range: () => { start: Date; end: Date } };
const PRESETS: Preset[] = [
  { label: "This week",  range: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: "Last week",  range: () => { const s = startOfWeek(subDays(new Date(),7),{weekStartsOn:1}); return { start: s, end: addDays(s,6) }; } },
  { label: "Last 7 days",range: () => ({ start: subDays(new Date(),6), end: new Date() }) },
  { label: "Last 30 days",range:() => ({ start: subDays(new Date(),29), end: new Date() }) },
  { label: "This month", range: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: "Last month", range: () => { const d=subMonths(new Date(),1); return { start: startOfMonth(d), end: endOfMonth(d) }; } },
];

// Pure-JS arrayBuffer → base64 (no Buffer dependency)
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "", i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const t = (bytes[i] << 16) | (bytes[i+1] << 8) | bytes[i+2];
    out += B64[(t >> 18) & 63] + B64[(t >> 12) & 63] + B64[(t >> 6) & 63] + B64[t & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const t = bytes[i] << 16;
    out += B64[(t >> 18) & 63] + B64[(t >> 12) & 63] + "==";
  } else if (rem === 2) {
    const t = (bytes[i] << 16) | (bytes[i+1] << 8);
    out += B64[(t >> 18) & 63] + B64[(t >> 12) & 63] + B64[(t >> 6) & 63] + "=";
  }
  return out;
}

export default function ReportsScreen() {
  const router = useRouter();

  // weekly summary
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [data, setData] = useState<any>(null);

  // export range
  const [start, setStart] = useState<Date>(startOfMonth(new Date()));
  const [end, setEnd] = useState<Date>(new Date());
  const [activePreset, setActivePreset] = useState<string>("This month");
  const [pickerFor, setPickerFor] = useState<"start" | "end" | null>(null);
  const [busy, setBusy] = useState<ReportKey | null>(null);

  const loadSummary = async () => {
    try {
      const s = format(weekStart, "yyyy-MM-dd");
      const r = await api.get("/report/weekly", { params: { start: s } });
      setData(r.data);
    } catch {}
  };
  useEffect(() => { loadSummary(); }, [weekStart]);

  const applyPreset = (p: Preset) => {
    const r = p.range();
    setStart(r.start); setEnd(r.end); setActivePreset(p.label);
  };

  const exportXlsx = async (key: ReportKey, label: string) => {
    if (start > end) { Alert.alert("Invalid range", "Start date must be before end date."); return; }
    setBusy(key);
    try {
      const s = format(start, "yyyy-MM-dd");
      const e = format(end, "yyyy-MM-dd");
      const filename = `${label.replace(/\s+/g,"_")}_${s}_to_${e}.xlsx`;

      const res = await api.get(`/export/${key}`, {
        params: { start: s, end: e },
        responseType: "arraybuffer",
      });

      if (Platform.OS === "web") {
        // Browser download
        const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const base64 = arrayBufferToBase64(res.data);
        const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
        const uri = dir + filename;
        await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            UTI: "org.openxmlformats.spreadsheetml.sheet",
            dialogTitle: `Save ${label} report`,
          });
        } else {
          Alert.alert("Saved", `File saved to:\n${uri}`);
        }
      }
    } catch (e: any) {
      Alert.alert("Export failed", e?.response?.data?.detail || e?.message || "Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Reports</Text>
        <View style={{width:26}}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: S.md, paddingBottom: 40 }}>

        {/* ---------- EXPORT TO EXCEL ---------- */}
        <Text style={s.section}>EXPORT TO EXCEL</Text>
        <Text style={s.helper}>Download .xlsx files for any date range. On Android pick &quot;Save to Files / Downloads&quot;.</Text>

        <View style={s.rangeCard}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity style={s.dateBtn} onPress={() => setPickerFor("start")} testID="exp-start">
              <Text style={s.dateLabel}>FROM</Text>
              <Text style={s.dateVal}>{format(start, "MMM d, yyyy")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.dateBtn} onPress={() => setPickerFor("end")} testID="exp-end">
              <Text style={s.dateLabel}>TO</Text>
              <Text style={s.dateVal}>{format(end, "MMM d, yyyy")}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.presetsWrap}>
            {PRESETS.map((p) => {
              const active = p.label === activePreset;
              return (
                <TouchableOpacity key={p.label} onPress={() => applyPreset(p)}
                  style={[s.preset, active && s.presetActive]} testID={`preset-${p.label}`}>
                  <Text style={[s.presetText, active && s.presetTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {REPORTS.map((r) => (
          <TouchableOpacity
            key={r.key}
            style={[s.exportRow, { borderLeftColor: r.color }]}
            onPress={() => exportXlsx(r.key, r.label)}
            disabled={busy !== null}
            testID={`export-${r.key}`}
          >
            <View style={[s.exportIcon, { backgroundColor: r.color + "22" }]}>
              <Ionicons name={r.icon} size={20} color={r.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.exportLabel}>{r.label}</Text>
              <Text style={s.exportSub}>{format(start, "MMM d")} – {format(end, "MMM d, yyyy")} · .xlsx</Text>
            </View>
            {busy === r.key
              ? <ActivityIndicator color={r.color} />
              : <Ionicons name="download-outline" size={22} color={C.text2} />}
          </TouchableOpacity>
        ))}

        {/* ---------- WEEKLY SUMMARY (existing) ---------- */}
        <Text style={[s.section, { marginTop: S.lg }]}>WEEKLY SUMMARY</Text>
        <View style={s.weekNav}>
          <TouchableOpacity onPress={()=>setWeekStart(addDays(weekStart,-7))} testID="w-prev"><Ionicons name="chevron-back" size={22} color={C.text}/></TouchableOpacity>
          <Text style={s.weekLabel}>{format(weekStart,"MMM d")} – {format(addDays(weekStart,6),"MMM d, yyyy")}</Text>
          <TouchableOpacity onPress={()=>setWeekStart(addDays(weekStart,7))} testID="w-next"><Ionicons name="chevron-forward" size={22} color={C.text}/></TouchableOpacity>
        </View>

        {data?.totals && (
          <View style={s.totals}>
            <Total l="Tank readings" v={data.totals.tank_readings} c="#A5C45A"/>
            <Total l="Environment" v={data.totals.environment_readings} c="#CC7753"/>
            <Total l="Field tasks" v={data.totals.field_tasks} c="#4A5D23"/>
            <Total l="Weekly checks" v={data.totals.weekly_checks} c="#32ADE6"/>
          </View>
        )}

        <Text style={s.section}>DAILY BREAKDOWN</Text>
        {data?.days?.map((d: any) => (
          <View key={d.date} style={s.day}>
            <View style={s.dayHead}>
              <Text style={s.dayLabel}>{format(new Date(d.date),"EEE, MMM d")}</Text>
              <Text style={s.dayCount}>{d.tank_readings_count + d.env_readings_count + d.field_tasks_count} entries</Text>
            </View>
            {d.tank_avg && (
              <View style={s.miniRow}>
                <Mini l="pH" v={d.tank_avg.ph}/>
                <Mini l="EC" v={d.tank_avg.ec}/>
                <Mini l="T°C" v={d.tank_avg.temp}/>
              </View>
            )}
            {d.env_avg && (
              <View style={s.miniRow}>
                <Mini l="Env T" v={`${d.env_avg.temperature}°C`}/>
                <Mini l="Env H" v={`${d.env_avg.humidity}%`}/>
              </View>
            )}
            <View style={s.tags}>
              <Tag l={`${d.tank_readings_count} tanks`} c="#EFF3DC"/>
              <Tag l={`${d.env_readings_count} env`} c="#FFF4EC"/>
              <Tag l={`${d.field_tasks_count} field`} c="#E5E0D8"/>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Native date picker */}
      {pickerFor && Platform.OS !== "web" && (
        <DateTimePicker
          value={pickerFor === "start" ? start : end}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_, d) => {
            const picked = d || (pickerFor === "start" ? start : end);
            if (pickerFor === "start") setStart(picked);
            else setEnd(picked);
            setActivePreset("Custom");
            setPickerFor(null);
          }}
        />
      )}

      {/* Web fallback: simple input modal */}
      {pickerFor && Platform.OS === "web" && (
        <Modal transparent animationType="fade" onRequestClose={() => setPickerFor(null)}>
          <View style={s.modalBg}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Pick {pickerFor === "start" ? "start" : "end"} date</Text>
              {/* @ts-ignore web-only input */}
              <input
                type="date"
                value={format(pickerFor === "start" ? start : end, "yyyy-MM-dd")}
                onChange={(ev: any) => {
                  const d = new Date(ev.target.value);
                  if (!isNaN(d.getTime())) {
                    if (pickerFor === "start") setStart(d); else setEnd(d);
                    setActivePreset("Custom");
                  }
                }}
                style={{ padding: 12, fontSize: 16, border: `1px solid ${C.border}`, borderRadius: 10, width: "100%" } as any}
              />
              <TouchableOpacity onPress={() => setPickerFor(null)} style={s.modalBtn}>
                <Text style={s.modalBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function Total({l,v,c}:any){return (<View style={[s.total,{borderLeftColor:c}]}><Text style={s.totalV}>{v}</Text><Text style={s.totalL}>{l}</Text></View>);}
function Mini({l,v}:any){return (<View style={s.mini}><Text style={s.miniLabel}>{l}</Text><Text style={s.miniVal}>{v}</Text></View>);}
function Tag({l,c}:any){return (<View style={[s.tag,{backgroundColor:c}]}><Text style={s.tagText}>{l}</Text></View>);}

const s = StyleSheet.create({
  c:{flex:1,backgroundColor:C.bg},
  head:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:S.md,borderBottomWidth:1,borderBottomColor:C.border},
  title:{fontSize:18,fontWeight:"700",color:C.text},
  helper:{fontSize:12,color:C.text2,marginBottom:S.sm},
  section:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:2,marginTop:S.md,marginBottom:S.sm},

  rangeCard:{backgroundColor:C.card,borderRadius:14,padding:S.md,borderWidth:1,borderColor:C.border,marginBottom:S.sm},
  dateBtn:{flex:1,backgroundColor:C.bg2,borderRadius:10,padding:12,borderWidth:1,borderColor:C.border},
  dateLabel:{fontSize:10,fontWeight:"700",color:C.text2,letterSpacing:1.5},
  dateVal:{fontSize:15,fontWeight:"700",color:C.text,marginTop:4},
  presetsWrap:{flexDirection:"row",flexWrap:"wrap",gap:6,marginTop:10},
  preset:{paddingHorizontal:10,paddingVertical:6,borderRadius:20,backgroundColor:C.bg2,borderWidth:1,borderColor:C.border},
  presetActive:{backgroundColor:C.brand,borderColor:C.brand},
  presetText:{fontSize:11,fontWeight:"700",color:C.text},
  presetTextActive:{color:"#fff"},

  exportRow:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:C.card,borderRadius:14,padding:14,borderWidth:1,borderColor:C.border,borderLeftWidth:4,marginBottom:8},
  exportIcon:{width:40,height:40,borderRadius:12,alignItems:"center",justifyContent:"center"},
  exportLabel:{fontSize:15,fontWeight:"700",color:C.text},
  exportSub:{fontSize:11,color:C.text2,marginTop:2},

  weekNav:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",backgroundColor:C.card,borderRadius:14,padding:14,borderWidth:1,borderColor:C.border,marginBottom:S.md},
  weekLabel:{fontWeight:"700",color:C.text,fontSize:14},
  totals:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:S.md},
  total:{flex:1,minWidth:"45%",backgroundColor:C.card,padding:S.md,borderRadius:14,borderWidth:1,borderColor:C.border,borderLeftWidth:4},
  totalV:{fontSize:26,fontWeight:"800",color:C.text},
  totalL:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:1.5,marginTop:2},
  day:{backgroundColor:C.card,borderRadius:14,padding:S.md,borderWidth:1,borderColor:C.border,marginBottom:8},
  dayHead:{flexDirection:"row",justifyContent:"space-between"},
  dayLabel:{fontWeight:"700",color:C.text,fontSize:14},
  dayCount:{fontSize:11,color:C.text2,fontWeight:"600"},
  miniRow:{flexDirection:"row",gap:8,marginTop:8},
  mini:{flex:1,backgroundColor:C.bg2,borderRadius:8,padding:8,alignItems:"center"},
  miniLabel:{fontSize:9,fontWeight:"700",color:C.text2,letterSpacing:1},
  miniVal:{fontSize:16,fontWeight:"800",color:C.text,marginTop:2},
  tags:{flexDirection:"row",gap:6,marginTop:10,flexWrap:"wrap"},
  tag:{paddingHorizontal:8,paddingVertical:4,borderRadius:6},
  tagText:{fontSize:10,fontWeight:"700",color:C.text,letterSpacing:0.5},

  modalBg:{flex:1,backgroundColor:"rgba(0,0,0,0.4)",justifyContent:"center",alignItems:"center",padding:S.md},
  modalCard:{backgroundColor:C.card,borderRadius:16,padding:S.md,width:"100%",maxWidth:360,gap:12},
  modalTitle:{fontSize:16,fontWeight:"700",color:C.text},
  modalBtn:{backgroundColor:C.brand,borderRadius:10,padding:12,alignItems:"center"},
  modalBtnText:{color:"#fff",fontWeight:"700"},
});
