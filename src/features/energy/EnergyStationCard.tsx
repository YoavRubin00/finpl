import { useEffect, useReducer, useRef, useState } from "react";
import { View, Text, StyleSheet, AppState, Pressable, type DimensionValue } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useReducedMotion,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { GlowCard } from "../../components/ui/GlowCard";
import { EnergyBatteryIcon } from "../../components/ui/EnergyBatteryIcon";
import { ENERGY } from "./energyTheme";
import {
  SHARK_CHARGING_IDLE,
  SHARK_FULL_CHEER,
  SHARK_LOW_NUDGE,
} from "./energyScenes";
import {
  useHeartsStore,
  MAX_ENERGY,
  ENERGY_REGEN_MS,
} from "../subscription/useHeartsStore";
import { useIsPro } from "../subscription/useSubscription";
import { tapHaptic, successHaptic } from "../../utils/haptics";

/**
 * תחנת הכוח — the always-visible energy power-station band at the top of the
 * main learning screen (DuoLearnScreen). Captain Shark visibly charges a live
 * purple battery; the user can tap "שחק +אנרגיה" to play a short game for more
 * energy. When the battery fills, the CTA flips to "יאללה, שיעור" so a full
 * battery PULLS into a lesson instead of hiding the button. Any energy gain
 * pops the battery + floats a "+N ⚡". Pure presentation — economy lives in
 * useHeartsStore.
 *
 * `onSpeedUp` opens the speed-up mini-game (the daily swipe quest).
 * `onStartLesson` jumps the user into their next lesson (full-battery CTA).
 */
export function EnergyStationCard({
  onStartLesson,
}: {
  onStartLesson?: () => void;
}) {
  const isPro = useIsPro();
  const reduceMotion = useReducedMotion();
  // Subscribe so spend/grant from anywhere re-renders the band.
  const rawUnits = useHeartsStore((s) => s.hearts);
  const lastLost = useHeartsStore((s) => s.lastHeartLostAt);
  const [, forceTick] = useReducer((c: number) => c + 1, 0);

  // Live tick: settle passive regen + recompute the countdown every second,
  // paused when the app is backgrounded (battery-safe). Pro never regenerates.
  useEffect(() => {
    if (isPro) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(() => {
        useHeartsStore.getState().refillHearts();
        forceTick();
      }, 1000);
    };
    const stop = () => {
      if (id) { clearInterval(id); id = null; }
    };
    start();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") start();
      else stop();
    });
    return () => { stop(); sub.remove(); };
  }, [isPro]);

  // Settled energy (raw + any pending passive refills). rawUnits/lastLost in the
  // dep-less render keep this fresh on store changes; forceTick covers the clock.
  void rawUnits;
  const units = isPro
    ? MAX_ENERGY
    : Math.min(MAX_ENERGY, useHeartsStore.getState().getHearts());
  const pct = Math.round((units / MAX_ENERGY) * 100);
  const isFull = units >= MAX_ENERGY;
  // Empty (0) → the "low/empty" shark; the moment there's ANY energy → the calm
  // charging shark; full → the celebration. (Yoav 18/06.)
  const isEmpty = !isPro && units <= 0;

  // ── Energy-gain juice: pop the battery + float a "+N ⚡" on any increase ──
  const prevEnergyRef = useRef(units);
  const pop = useSharedValue(1);
  const gainOpacity = useSharedValue(0);
  const gainY = useSharedValue(0);
  const [gainText, setGainText] = useState("");
  useEffect(() => {
    const prev = prevEnergyRef.current;
    prevEnergyRef.current = units;
    if (isPro || reduceMotion) return;
    if (units > prev) {
      setGainText(`+${units - prev}`);
      pop.value = withSequence(
        withSpring(1.22, { damping: 9, stiffness: 320 }),
        withSpring(1, { damping: 13, stiffness: 220 }),
      );
      gainOpacity.value = 0;
      gainY.value = 0;
      gainOpacity.value = withSequence(
        withTiming(1, { duration: 180 }),
        withTiming(0, { duration: 620 }),
      );
      gainY.value = withTiming(-26, { duration: 800 });
      try { successHaptic(); } catch { /* non-fatal */ }
    }
  }, [units, isPro, reduceMotion, pop, gainOpacity, gainY]);

  const batteryPopStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const gainStyle = useAnimatedStyle(() => ({
    opacity: gainOpacity.value,
    transform: [{ translateY: gainY.value }],
  }));

  // Countdown to the next unit (only while charging).
  let countdownLabel = "";
  if (!isPro && !isFull && lastLost) {
    const elapsed = Math.max(0, Date.now() - new Date(lastLost).getTime());
    const msUntil = ENERGY_REGEN_MS - (elapsed % ENERGY_REGEN_MS);
    const totalSec = Math.max(0, Math.ceil(msUntil / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    countdownLabel = `↻ עוד יחידה בעוד ${m}:${String(s).padStart(2, "0")}`;
  }

  const sharkSrc = isFull || isPro
    ? SHARK_FULL_CHEER
    : isEmpty
      ? SHARK_LOW_NUDGE
      : SHARK_CHARGING_IDLE;

  const countLabel = isPro ? "∞" : `${units} / ${MAX_ENERGY}`;
  const subline = isPro
    ? "Pro — אנרגיה אינסופית"
    : isFull
      ? "אנרגיה מלאה — הזמן המושלם לשיעור"
      : countdownLabel;

  // CTA: full battery → pull into a lesson; otherwise → speed-up game. Pro: none.
  const ctaMode: "start" | "none" =
    !isPro && isFull && onStartLesson ? "start" : "none";

  const a11yLabel = isPro
    ? "אנרגיה: אינסופית, מנוי Pro"
    : `אנרגיה: ${units} מתוך ${MAX_ENERGY}${isFull ? ", מלא" : countdownLabel ? `, ${countdownLabel.replace("↻ ", "")}` : ""}`;

  return (
    <View style={styles.wrap}>
      <GlowCard glowColor={ENERGY.glow} pressable={false} style={styles.card}>
        <View style={styles.row}>
          {/* Charging Captain Shark */}
          <ExpoImage
            source={sharkSrc}
            style={styles.shark}
            contentFit="contain"
            accessible={false}
            pointerEvents="none"
          />

          {/* Live meter */}
          <View
            style={styles.meter}
            accessibilityRole="progressbar"
            accessibilityLabel={a11yLabel}
            accessibilityValue={{ min: 0, max: MAX_ENERGY, now: units }}
          >
            <View style={styles.meterTop}>
              <View style={styles.titleGroup}>
                <Text style={styles.title}>אנרגיה</Text>
                <Animated.View style={batteryPopStyle}>
                  <EnergyBatteryIcon size={22} level={isPro ? 1 : units / MAX_ENERGY} />
                </Animated.View>
                {/* "+N ⚡" floating gain */}
                <Animated.Text style={[styles.gain, gainStyle]} pointerEvents="none">
                  {`${gainText} ⚡`}
                </Animated.Text>
              </View>
              <Text style={styles.count}>{countLabel}</Text>
            </View>

            {/* Purple gauge — fills from the right (RTL) */}
            <View style={styles.gauge}>
              <LinearGradient
                colors={[ENERGY.base, ENERGY.deep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.gaugeFill, { width: `${Math.max(isPro ? 100 : pct, 0)}%` as DimensionValue }]}
              >
                {!reduceMotion && <View style={styles.gaugeShine} />}
              </LinearGradient>
            </View>

            {subline ? <Text style={styles.sub}>{subline}</Text> : null}
          </View>

          {/* CTA — "start a lesson" when the battery is full */}
          {ctaMode === "start" && (
            <Pressable
              onPress={() => { tapHaptic(); onStartLesson?.(); }}
              style={styles.cta}
              accessibilityRole="button"
              accessibilityLabel="האנרגיה מלאה, התחילו שיעור"
            >
              <Text style={styles.ctaTop}>יאללה</Text>
              <Text style={styles.ctaBottom}>שיעור 🚀</Text>
            </Pressable>
          )}
        </View>
      </GlowCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  card: {
    padding: 12,
    borderRadius: 18,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  shark: {
    width: 60,
    height: 60,
    flexShrink: 0,
  },
  meter: {
    flex: 1,
    alignItems: "flex-end",
  },
  meterTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 6,
  },
  titleGroup: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1f2937",
    writingDirection: "rtl",
  },
  gain: {
    position: "absolute",
    top: -18,
    left: 0,
    fontSize: 13,
    fontWeight: "900",
    color: ENERGY.deep,
    writingDirection: "rtl",
  },
  count: {
    fontSize: 15,
    fontWeight: "800",
    color: ENERGY.deep,
    fontVariant: ["tabular-nums"],
    writingDirection: "rtl",
  },
  gauge: {
    width: "100%",
    height: 18,
    borderRadius: 9,
    backgroundColor: ENERGY.track,
    overflow: "hidden",
    flexDirection: "row-reverse",
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 9,
    justifyContent: "flex-start",
  },
  gaugeShine: {
    position: "absolute",
    top: 3,
    left: 4,
    right: 4,
    height: 5,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.30)",
  },
  sub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 5,
    writingDirection: "rtl",
    textAlign: "right",
  },
  cta: {
    flexShrink: 0,
    backgroundColor: ENERGY.base,
    borderBottomWidth: 4,
    borderBottomColor: ENERGY.deep,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 64,
  },
  ctaTop: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
  },
  ctaBottom: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
    writingDirection: "rtl",
  },
});