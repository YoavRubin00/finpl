import React, { useState, useRef, useCallback, useEffect } from "react";
import { Image as ExpoImage } from "expo-image";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrendingUp } from "lucide-react-native";
import { useRouter } from "expo-router";
import { FINN_STANDARD, FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { BackButton } from "../../components/ui/BackButton";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SkiaInteractiveChart } from "../../components/ui/SkiaInteractiveChart";
import type { ChartDataPoint } from "../../components/ui/SkiaInteractiveChart";

const SCREEN_WIDTH = Dimensions.get("window").width;

// ── Compound interest logic ─────────────────────────────────────────────────

export function calculateCompoundInterest(initial: number, monthly: number, years: number, rate = 0.08) {
  const months = years * 12;
  const monthlyRate = rate / 12;
  let total = initial;
  for (let i = 0; i < months; i++) {
    total = (total + monthly) * (1 + monthlyRate);
  }
  return Math.round(total);
}

// ── RTL Slider ──────────────────────────────────────────────────────────────

function SimSlider({
  label, value, min, max, step, onChange, prefix = "", suffix = "",
  accentColor = "#0891b2", trackBg = "#cffafe", showFingerHint = false,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; prefix?: string; suffix?: string;
  accentColor?: string; trackBg?: string; showFingerHint?: boolean;
}) {
  const trackRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, width: 0 });
  const propsRef = useRef({ min, max, step, onChange });
  propsRef.current = { min, max, step, onChange };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => updateVal(evt.nativeEvent.pageX),
      onPanResponderMove: (evt) => updateVal(evt.nativeEvent.pageX),
    })
  ).current;

  function updateVal(pageX: number) {
    const { x, width } = layoutRef.current;
    if (width <= 0) return;
    const localX = Math.max(0, Math.min(pageX - x, width));
    const pct = 1 - (localX / width); // RTL
    const { min: mn, max: mx, step: st, onChange: cb } = propsRef.current;
    let v = mn + pct * (mx - mn);
    v = Math.round(v / st) * st;
    cb(Math.max(mn, Math.min(mx, v)));
  }

  const pct = (value - min) / (max - min);

  return (
    <View style={{ marginBottom: 14, overflow: "visible", zIndex: showFingerHint ? 100 : 1 }}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: `${prefix}${value.toLocaleString()}${suffix}` }}
    >
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#64748b", writingDirection: "rtl" }}>{label}</Text>
        <View style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: trackBg }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: accentColor }}>{prefix}{value.toLocaleString()}{suffix}</Text>
        </View>
      </View>
      <View
        ref={trackRef}
        style={{ height: 10, width: "100%", justifyContent: "center", borderRadius: 999, backgroundColor: trackBg, overflow: "visible", zIndex: 50 }}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          trackRef.current?.measureInWindow((x: number) => { layoutRef.current = { x, width }; });
        }}
        {...panResponder.panHandlers}
      >
        <View style={{ position: "absolute", right: 0, height: "100%", borderRadius: 999, width: `${pct * 100}%`, backgroundColor: accentColor + "60" }} />
        <View style={{
          position: "absolute", right: `${pct * 100}%`, transform: [{ translateX: 16 }],
          height: 32, width: 32, borderRadius: 16, backgroundColor: accentColor,
          borderWidth: 3, borderColor: "#ffffff", alignItems: "center", justifyContent: "center",
          shadowColor: accentColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
          overflow: "visible", zIndex: 999,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#ffffff" }} />
          {showFingerHint && (
            <Animated.Text
              pointerEvents="none"
              entering={FadeIn.duration(400)}
              style={{ position: "absolute", top: 24, fontSize: 28, zIndex: 9999, elevation: 9999 }}
            >👆</Animated.Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export function SimulatorScreen() {
  const router = useRouter();
  const [initial, setInitial] = useState(0);
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(10);
  const [subStep, setSubStep] = useState<"play" | "summary">("play");
  const [hasInteracted, setHasInteracted] = useState(false);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  // Auto-slide monthly from ₪500 to ₪2,000 over 3s
  useEffect(() => {
    startTimeRef.current = Date.now();
    autoSlideRef.current = setInterval(() => {
      const t = Math.min((Date.now() - startTimeRef.current) / 3000, 1);
      const eased = t * t;
      const val = Math.round((500 + eased * 1500) / 50) * 50;
      setMonthly(val);
      if (t >= 1) {
        if (autoSlideRef.current) clearInterval(autoSlideRef.current);
        setHasInteracted(true);
      }
    }, 80);
    return () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
  }, []);

  useEffect(() => {
    if (hasInteracted && autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
      autoSlideRef.current = null;
    }
  }, [hasInteracted]);

  const finalAmount = calculateCompoundInterest(initial, monthly, years);
  const totalInvested = initial + monthly * 12 * years;
  const totalGrowth = finalAmount - totalInvested;
  const growthPct = totalInvested > 0 ? ((totalGrowth / totalInvested) * 100).toFixed(0) : "0";

  const chartData: ChartDataPoint[] = [];
  const CHART_STEPS = Math.max(years * 4, 40);
  for (let s = 0; s <= CHART_STEPS; s++) {
    const t = s / CHART_STEPS;
    const yr = t * years;
    const val = calculateCompoundInterest(initial, monthly, yr);
    chartData.push({ x: t, y: finalAmount > 0 ? val / finalAmount : 0, label: `שנה ${Math.round(yr)}` });
  }

  const chartWidth = SCREEN_WIDTH - 80;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/more" as never);
  }, [router]);

  // ── Screen 2: Summary ──
  if (subStep === "summary") {
    return (
      <View style={s.root}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, alignItems: "flex-end" }}>
            <BackButton onPress={goBack} />
          </View>

          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, gap: 16 }}>
            <ExpoImage source={FINN_HAPPY} accessible={false} style={{ width: 100, height: 100 }} contentFit="contain" />
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748b", textAlign: "center", writingDirection: "rtl" }}>
              הכסף שלך בעוד {years} שנים
            </Text>
            <Text style={{ fontSize: 42, fontWeight: "900", color: "#0369a1", textAlign: "center", textShadowColor: "rgba(14,165,233,0.2)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 }}>
              ₪{finalAmount.toLocaleString()}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>סה"כ הושקע</Text>
                <Text style={s.statValue}>₪{totalInvested.toLocaleString()}</Text>
              </View>
              <View style={[s.statCard, { borderColor: "rgba(34,197,94,0.2)", backgroundColor: "#f0fdf4" }]}>
                <Text style={[s.statLabel, { color: "#15803d" }]}>רווח מריבית דריבית</Text>
                <Text style={[s.statValue, { color: "#16a34a" }]}>+₪{totalGrowth.toLocaleString()}</Text>
              </View>
            </View>

            <View style={s.growthBadge}>
              <TrendingUp size={16} color="#16a34a" />
              <Text style={s.growthText}>תשואה של {growthPct}%</Text>
            </View>

            {/* CTA to compound interest module */}
            <Pressable
              onPress={() => router.push("/lesson/mod-1-1?chapterId=chapter-1" as never)}
              style={s.moduleCta}
            >
              <Text style={s.moduleCtaText}>ללמוד ריבית דריבית</Text>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
            <Pressable onPress={goBack} style={s.backBtn}>
              <Text style={s.backBtnText}>חזרה</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Screen 1: Play with numbers ──
  return (
    <View style={s.root}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, alignItems: "flex-end" }}>
          <BackButton onPress={goBack} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: "space-between" }}>
          {/* Finn + Title */}
          <View style={{ alignItems: "center", marginTop: 4, marginBottom: 6 }}>
            <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 70, height: 70 }} contentFit="contain" />
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#0c4a6e", textAlign: "center", writingDirection: "rtl", marginTop: 4 }}>
              לשחק עם המספרים
            </Text>
          </View>

          {/* Hero card */}
          <Animated.View entering={FadeInUp.delay(200).springify()} style={s.heroCard}>
            <Text style={s.heroLabel}>הכסף שלך בעוד {years} שנים</Text>
            <Text style={s.heroValue}>₪{finalAmount.toLocaleString()}</Text>
            <GestureHandlerRootView style={{ marginTop: 6 }}>
              <SkiaInteractiveChart
                data={chartData}
                width={chartWidth - 32}
                height={100}
                lineColor="#0891b2"
                glowColor="#22d3ee"
                gradientColors={["rgba(34,211,238,0.18)", "rgba(34,211,238,0)"]}
                onScrub={() => {}}
                hapticMilestone={5}
              />
            </GestureHandlerRootView>
          </Animated.View>

          {/* Sliders */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={s.slidersCard}>
            <SimSlider
              label="סכום התחלתי" value={initial} min={0} max={1000000} step={5000}
              prefix="₪" accentColor="#10b981" trackBg="#d1fae5"
              onChange={(v) => { setHasInteracted(true); setInitial(v); }}
            />
            <SimSlider
              label="השקעה חודשית" value={monthly} min={50} max={5000} step={50}
              prefix="₪" accentColor="#0891b2" trackBg="#cffafe"
              onChange={(v) => { setHasInteracted(true); setMonthly(v); }}
              showFingerHint={!hasInteracted}
            />
            <SimSlider
              label="טווח זמן" value={years} min={1} max={40} step={1}
              suffix=" שנים" accentColor="#60a5fa" trackBg="#dbeafe"
              onChange={(v) => { setHasInteracted(true); setYears(v); }}
            />
          </Animated.View>

          {/* Next button */}
          <Pressable onPress={() => setSubStep("summary")} style={s.continueBtn}>
            <Text style={s.continueBtnText}>הבא</Text>
          </Pressable>
          <View style={{ height: 8 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff" },
  heroCard: {
    borderRadius: 24, borderWidth: 1, borderColor: "rgba(14,165,233,0.15)",
    padding: 20, paddingBottom: 10, marginBottom: 14, overflow: "hidden",
    backgroundColor: "#ffffff",
    shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 6,
  },
  heroLabel: { fontSize: 13, fontWeight: "700", color: "#64748b", textAlign: "center", writingDirection: "rtl", marginBottom: 4 },
  heroValue: {
    fontSize: 38, fontWeight: "900", color: "#0369a1", textAlign: "center", letterSpacing: -1,
    textShadowColor: "rgba(14,165,233,0.2)", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  slidersCard: {
    backgroundColor: "#ffffff", borderRadius: 22, borderWidth: 1,
    borderColor: "rgba(186,230,253,0.5)", padding: 20, marginBottom: 14,
    shadowColor: "#0c4a6e", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4,
  },
  statCard: {
    flex: 1, backgroundColor: "#f8fafc", borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: "rgba(186,230,253,0.4)", alignItems: "center",
    shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#64748b", textAlign: "center", writingDirection: "rtl", marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  growthBadge: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#f0fdf4", borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: "rgba(34,197,94,0.2)",
    shadowColor: "#22c55e", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  growthText: { fontSize: 14, fontWeight: "800", color: "#16a34a", textAlign: "center", writingDirection: "rtl" },
  continueBtn: {
    width: "100%", backgroundColor: "#0891b2", borderRadius: 18, paddingVertical: 20,
    alignItems: "center", borderBottomWidth: 4, borderBottomColor: "#0e7490",
    shadowColor: "#0891b2", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  continueBtnText: { fontSize: 18, fontWeight: "900", color: "#ffffff" },
  moduleCta: {
    width: "100%", backgroundColor: "#0ea5e9", borderRadius: 16, paddingVertical: 16,
    alignItems: "center", borderBottomWidth: 3, borderBottomColor: "#0284c7",
    shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  moduleCtaText: { fontSize: 16, fontWeight: "800", color: "#ffffff", writingDirection: "rtl" },
  backBtn: {
    width: "100%", backgroundColor: "#f1f5f9", borderRadius: 16, paddingVertical: 14,
    alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0",
  },
  backBtnText: { fontSize: 16, fontWeight: "700", color: "#64748b" },
});
