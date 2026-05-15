import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, startOfWeek, addDays } from "date-fns";
import { api } from "../../src/api";
import { C, S } from "../../src/theme";

export default function WeeklyReport() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [data, setData] = useState<any>(null);

  const load = async () => {
    const start = format(weekStart, "yyyy-MM-dd");
    const r = await api.get("/report/weekly", { params: { start } });
    setData(r.data);
  };
  useEffect(() => { load(); }, [weekStart]);

  return (
    <SafeAreaView style={s.c} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={26} color={C.text} /></TouchableOpacity>
        <Text style={s.title}>Weekly report</Text>
        <View style={{width:26}}/>
      </View>
      <ScrollView contentContainerStyle={{padding:S.md}}>
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
  weekNav:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",backgroundColor:C.card,borderRadius:14,padding:14,borderWidth:1,borderColor:C.border,marginBottom:S.md},
  weekLabel:{fontWeight:"700",color:C.text,fontSize:14},
  totals:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:S.md},
  total:{flex:1,minWidth:"45%",backgroundColor:C.card,padding:S.md,borderRadius:14,borderWidth:1,borderColor:C.border,borderLeftWidth:4},
  totalV:{fontSize:26,fontWeight:"800",color:C.text},
  totalL:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:1.5,marginTop:2},
  section:{fontSize:11,fontWeight:"700",color:C.text2,letterSpacing:2,marginTop:S.md,marginBottom:S.sm},
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
});
