import React, { useState, useMemo, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Rect, G, Text as SvgText } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  FadeInUp,
  FadeOutDown,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { Image as ExpoImage } from "expo-image";
import { FINN_HAPPY } from "../../retention-loops/finnMascotConfig";
import { tapHaptic, successHaptic } from "../../../utils/haptics";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };
const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_PADDING_H = 16;
const CHART_W = SCREEN_WIDTH - CHART_PADDING_H * 2 - 32;
const CHART_H = 220;
const X_AXIS_H = 28;
const Y_AXIS_W = 44;
const PLOT_W = CHART_W - Y_AXIS_W;
const PLOT_H = CHART_H - X_AXIS_H;

interface DataPoint {
  date: string;
  label: string;
  value: number;
  t: number;
}

const RAW: Array<{ date: string; label: string; value: number }> = [
  { date: "2023-10-06", label: "6.10.23", value: 1844 },
  { date: "2023-10-08", label: "8.10", value: 1730 },
  { date: "2023-10-15", label: "15.10", value: 1668 },
  { date: "2023-10-26", label: "26.10", value: 1625 },
  { date: "2023-11-30", label: "11/23", value: 1750 },
  { date: "2023-12-31", label: "12/23", value: 1831 },
  { date: "2024-06-30", label: "6/24", value: 2080 },
  { date: "2024-12-31", label: "12/24", value: 2380 },
  { date: "2025-06-30", label: "6/25", value: 2950 },
  { date: "2025-12-31", label: "12/25", value: 3594 },
  { date: "2026-01-26", label: "1/26", value: 4017 },
];

const DATA: DataPoint[] = RAW.map((p) => ({ ...p, t: new Date(p.date).getTime() }));
const T_MIN = DATA[0].t;
const T_MAX = DATA[DATA.length - 1].t;
const T_SPAN = T_MAX - T_MIN;
const V_MIN = 1550;
const V_MAX = 4150;
const V_SPAN = V_MAX - V_MIN;
const BASELINE = 1844;

type Milestone = {
  idx: number;
  title: string;
  headline: string;
  finnText: string;
  color: string;
};

const MILESTONES: Milestone[] = [
  {
    idx: 1,
    title: "7 באוקטובר 2023",
    headline: "הפאניקה",
    finnText: "קפטן שארק: ביום הראשון השוק צלל 6.2%. מי שמכר כאן, נעל את ההפסד. הרגש שולט על ההיגיון.",
    color: "#ef4444",
  },
  {
    idx: 3,
    title: "סוף אוקטובר 2023",
    headline: "התחתית",
    finnText: "קפטן שארק 📉: הגענו ל-1625. מינוס 12% מהשיא. הכותרות צועקות 'הכלכלה קורסת'. אבל הנה הסוד, כאן דווקא נולדות ההזדמנויות.",
    color: "#f59e0b",
  },
  {
    idx: 5,
    title: "דצמבר 2023",
    headline: "חזרה מלאה",
    finnText: "קפטן שארק ✅: תוך חודשיים השוק חזר לרמה לפני המלחמה. מי שלא נגע, לא איבד אגורה. מי שקנה בתחתית? פייק ניצחון.",
    color: "#22c55e",
  },
  {
    idx: 10,
    title: "ינואר 2026",
    headline: "שיא כל הזמנים",
    finnText: "קפטן שארק 🚀: 4,017 נקודות! +118% מהתחתית. +117% מיום המלחמה. ההיסטוריה תמיד חוזרת על עצמה, מי שהחזיק, ניצח.",
    color: "#10b981",
  },
];

function xAt(t: number): number {
  return Y_AXIS_W + ((t - T_MIN) / T_SPAN) * PLOT_W;
}
function yAt(v: number): number {
  return PLOT_H - ((v - V_MIN) / V_SPAN) * PLOT_H;
}

function buildPath(points: DataPoint[]): string {
  if (points.length === 0) return "";
  let d = `M ${xAt(points[0].t).toFixed(2)} ${yAt(points[0].value).toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${xAt(points[i].t).toFixed(2)} ${yAt(points[i].value).toFixed(2)}`;
  }
  return d;
}

function valueAtX(px: number): { value: number; idx: number; t: number } {
  const clamped = Math.max(Y_AXIS_W, Math.min(Y_AXIS_W + PLOT_W, px));
  const frac = (clamped - Y_AXIS_W) / PLOT_W;
  const t = T_MIN + frac * T_SPAN;
  let lo = 0;
  for (let i = 0; i < DATA.length - 1; i++) {
    if (DATA[i].t <= t && t <= DATA[i + 1].t) {
      lo = i;
      break;
    }
  }
  const a = DATA[lo];
  const b = DATA[lo + 1] ?? DATA[lo];
  const segFrac = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
  const value = a.value + (b.value - a.value) * segFrac;
  const idx = segFrac < 0.5 ? lo : Math.min(lo + 1, DATA.length - 1);
  return { value, idx, t };
}

function formatDate(t: number): string {
  const d = new Date(t);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

export function TA125WarRecoveryChart({ onContinue }: { onContinue: () => void }) {
  const [sliderX, setSliderX] = useState<number>(Y_AXIS_W);
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);
  const [visitedMilestones, setVisitedMilestones] = useState<Set<number>>(new Set());
  const drawProgress = useSharedValue(0);

  const pathD = useMemo(() => buildPath(DATA), []);
  const baselineY = yAt(BASELINE);

  useEffect(() => {
    drawProgress.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) });
  }, [drawProgress]);

  const current = valueAtX(sliderX);
  const sliderY = yAt(current.value);
  const deltaFromBaseline = ((current.value - BASELINE) / BASELINE) * 100;
  const isAboveBaseline = current.value >= BASELINE;

  const animatedPathProps = useAnimatedStyle(() => {
    return {};
  });

  const handleSliderMove = (absoluteX: number) => {
    const px = absoluteX - CHART_PADDING_H - 16;
    const clamped = Math.max(Y_AXIS_W, Math.min(Y_AXIS_W + PLOT_W, px));
    setSliderX(clamped);
    const { idx } = valueAtX(clamped);
    const milestone = MILESTONES.find((m) => m.idx === idx);
    if (milestone && !visitedMilestones.has(milestone.idx)) {
      tapHaptic();
      setVisitedMilestones((prev) => new Set([...prev, milestone.idx]));
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      handleSliderMove(e.absoluteX);
    })
    .onUpdate((e) => {
      handleSliderMove(e.absoluteX);
    })
    .runOnJS(true);

  const tap = Gesture.Tap()
    .onEnd((e) => {
      handleSliderMove(e.absoluteX);
    })
    .runOnJS(true);

  const gesture = Gesture.Race(pan, tap);

  const xTicks = useMemo(() => {
    return [DATA[0], DATA[3], DATA[5], DATA[7], DATA[10]];
  }, []);

  const milestoneReady = visitedMilestones.size >= MILESTONES.length;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, RTL]}>ת"א 125: מ-7.10.23 עד היום</Text>
          <Text style={[styles.subtitle, RTL]}>גררו את האצבע על הגרף כדי לראות את הערך בכל נקודה</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, RTL]}>ערך נוכחי</Text>
            <Text style={[styles.statValueBig]}>{current.value.toFixed(0)}</Text>
            <Text style={[styles.statDate, RTL]}>{formatDate(current.t)}</Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: isAboveBaseline ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" },
            ]}
          >
            <Text style={[styles.statLabel, RTL]}>מה-6.10.23</Text>
            <Text
              style={[
                styles.statValueBig,
                { color: isAboveBaseline ? "#10b981" : "#ef4444" },
              ]}
            >
              {isAboveBaseline ? "+" : ""}
              {deltaFromBaseline.toFixed(1)}%
            </Text>
            <Text style={[styles.statDate, RTL]}>{isAboveBaseline ? "🚀 מעל השיא" : "📉 מתחת לשיא"}</Text>
          </View>
        </View>

        <GestureDetector gesture={gesture}>
          <View style={styles.chartWrap}>
            <Svg width={CHART_W} height={CHART_H}>
              <Defs>
                <LinearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#0ea5e9" stopOpacity="0.35" />
                  <Stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
                </LinearGradient>
                <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor="#ef4444" />
                  <Stop offset="0.15" stopColor="#f97316" />
                  <Stop offset="0.3" stopColor="#eab308" />
                  <Stop offset="0.5" stopColor="#22c55e" />
                  <Stop offset="1" stopColor="#10b981" />
                </LinearGradient>
              </Defs>

              {/* horizontal grid lines */}
              {[2000, 2500, 3000, 3500, 4000].map((v) => (
                <G key={v}>
                  <Line
                    x1={Y_AXIS_W}
                    x2={Y_AXIS_W + PLOT_W}
                    y1={yAt(v)}
                    y2={yAt(v)}
                    stroke="rgba(148,163,184,0.15)"
                    strokeWidth={1}
                  />
                  <Rect x={0} y={yAt(v) - 8} width={Y_AXIS_W - 4} height={16} fill="transparent" />
                </G>
              ))}

              {/* baseline (6.10.23) */}
              <Line
                x1={Y_AXIS_W}
                x2={Y_AXIS_W + PLOT_W}
                y1={baselineY}
                y2={baselineY}
                stroke="#38bdf8"
                strokeWidth={1.2}
                strokeDasharray="4 4"
                opacity={0.55}
              />

              {/* area fill below line */}
              <Path d={`${pathD} L ${xAt(T_MAX).toFixed(2)} ${PLOT_H} L ${xAt(T_MIN).toFixed(2)} ${PLOT_H} Z`} fill="url(#fillGrad)" opacity={0.9} />

              {/* main line */}
              <Path d={pathD} stroke="url(#lineGrad)" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />

              {/* milestone markers */}
              {MILESTONES.map((m) => {
                const p = DATA[m.idx];
                return (
                  <G key={m.idx}>
                    <Circle cx={xAt(p.t)} cy={yAt(p.value)} r={10} fill={m.color} opacity={0.18} />
                    <Circle cx={xAt(p.t)} cy={yAt(p.value)} r={5.5} fill={m.color} stroke="#0f172a" strokeWidth={1.5} />
                  </G>
                );
              })}

              {/* vertical slider line */}
              <Line
                x1={sliderX}
                x2={sliderX}
                y1={0}
                y2={PLOT_H}
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="3 3"
                opacity={0.8}
              />
              {/* slider dot */}
              <Circle cx={sliderX} cy={sliderY} r={9} fill="#38bdf8" opacity={0.3} />
              <Circle cx={sliderX} cy={sliderY} r={5} fill="#f8fafc" stroke="#0284c7" strokeWidth={2} />

              {/* y-axis labels */}
              {[2000, 2500, 3000, 3500, 4000].map((v) => (
                <SvgText
                  key={`y-${v}`}
                  x={Y_AXIS_W - 6}
                  y={yAt(v) + 4}
                  fontSize={9}
                  fill="#94a3b8"
                  textAnchor="end"
                >
                  {v}
                </SvgText>
              ))}
            </Svg>

            {/* x-axis labels */}
            <View style={styles.xAxisRow}>
              {xTicks.map((p) => (
                <Text key={p.date} style={styles.xTick}>
                  {p.label}
                </Text>
              ))}
            </View>
          </View>
        </GestureDetector>

        {/* Milestone chips */}
        <View style={styles.milestoneChipsRow}>
          {MILESTONES.map((m) => {
            const visited = visitedMilestones.has(m.idx);
            return (
              <Pressable
                key={m.idx}
                onPress={() => {
                  tapHaptic();
                  const newX = xAt(DATA[m.idx].t);
                  setSliderX(newX);
                  if (!visited) setVisitedMilestones((prev) => new Set([...prev, m.idx]));
                  setActiveMilestone(m.idx);
                }}
                style={[
                  styles.chip,
                  { borderColor: m.color, backgroundColor: visited ? `${m.color}22` : "transparent" },
                ]}
              >
                <View style={[styles.chipDot, { backgroundColor: m.color }]} />
                <Text
                  style={[styles.chipText, RTL]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {m.headline}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Active milestone popup */}
        {activeMilestone !== null && (() => {
          const m = MILESTONES.find((x) => x.idx === activeMilestone);
          if (!m) return null;
          const p = DATA[m.idx];
          return (
            <Animated.View
              entering={FadeInUp.duration(220)}
              exiting={FadeOutDown.duration(180)}
              style={styles.popup}
            >
              <ExpoImage source={FINN_HAPPY} style={styles.popupFinn} contentFit="contain" />
              <View style={styles.popupBody}>
                <View style={styles.popupHeaderRow}>
                  <Text style={[styles.popupTitle, RTL]}>{m.title}</Text>
                  <View style={[styles.popupValueBadge, { backgroundColor: `${m.color}18`, borderColor: m.color }]}>
                    <Text style={[styles.popupValueText, { color: m.color }]}>{p.value.toLocaleString()}</Text>
                  </View>
                </View>
                <Text style={[styles.popupText, RTL]}>{m.finnText}</Text>
                <Pressable onPress={() => setActiveMilestone(null)} style={styles.popupClose} hitSlop={10}>
                  <Text style={{ color: "#64748b", fontSize: 18, fontWeight: "700" }}>✕</Text>
                </Pressable>
              </View>
            </Animated.View>
          );
        })()}

        {/* Continue */}
        <View style={styles.footer}>
          <Text style={[styles.hintText, RTL]}>
            {milestoneReady
              ? "💙 כל הנקודות נחשפו, אפשר להמשיך"
              : `גלו עוד ${MILESTONES.length - visitedMilestones.size} נקודות מפתח`}
          </Text>
          <Pressable
            onPress={() => {
              successHaptic();
              onContinue();
            }}
            style={[styles.continueBtn, !milestoneReady && styles.continueBtnDim]}
          >
            <Text style={styles.continueBtnText}>
              {milestoneReady ? "הבנתי, המשך ←" : "המשך בלי לראות הכל ←"}
            </Text>
          </Pressable>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 16,
  },
  header: { alignItems: "flex-end", marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "900", color: "#f8fafc" },
  subtitle: { fontSize: 12, fontWeight: "600", color: "#94a3b8", marginTop: 2 },

  statsRow: { flexDirection: "row-reverse", gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(56,189,248,0.08)",
    borderRadius: 14,
    padding: 10,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(56,189,248,0.15)",
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8" },
  statValueBig: { fontSize: 22, fontWeight: "900", color: "#f8fafc", marginTop: 2 },
  statDate: { fontSize: 10, color: "#64748b", marginTop: 2 },

  chartWrap: { alignItems: "center", paddingVertical: 4 },
  xAxisRow: {
    width: CHART_W - Y_AXIS_W,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: Y_AXIS_W,
    marginTop: -4,
  },
  xTick: { fontSize: 9.5, color: "#64748b", fontWeight: "600" },

  milestoneChipsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 11, fontWeight: "800", color: "#f1f5f9" },

  popup: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  popupFinn: { width: 56, height: 56, flexShrink: 0 },
  popupBody: { flex: 1, paddingRight: 4 },
  popupHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  popupTitle: { fontSize: 14, fontWeight: "900", color: "#f8fafc", flex: 1 },
  popupValueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  popupValueText: { fontSize: 12, fontWeight: "900" },
  popupText: { fontSize: 12.5, color: "#cbd5e1", lineHeight: 19, fontWeight: "600" },
  popupClose: { position: "absolute", top: -4, left: 0 },

  footer: { marginTop: "auto", paddingTop: 14, alignItems: "stretch" },
  hintText: { fontSize: 12, color: "#94a3b8", fontWeight: "700", marginBottom: 8, textAlign: "center" },
  continueBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#0284c7",
  },
  continueBtnDim: { backgroundColor: "#334155", borderBottomColor: "#1e293b" },
  continueBtnText: { fontSize: 16, fontWeight: "900", color: "#ffffff" },
});
