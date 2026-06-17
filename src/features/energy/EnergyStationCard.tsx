import { useEffect, useReducer } from "react";
import { View, Text, StyleSheet, AppState, Pressable, type DimensionValue } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useReducedMotion } from "react-native-reanimated";
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
import { tapHaptic } from "../../utils/haptics";

/**
 * תחנת הכוח — the always-visible energy power-station band at the top of the
 * main learning screen (DuoLearnScreen). Captain Shark visibly charges a live
 * purple battery; the user can tap "טען מהר" to play a short game for more
 * energy. Pure presentation — all economy lives in useHeartsStore.
 *
 * `onSpeedUp` opens the speed-up mini-game (the daily swipe quest in
 * DuoLearnScreen). Winning it grants energy via grantEnergy('station-game').
 */
const LOW_ENERGY_THRESHOLD = 3;

export function EnergyStationCard({ onSpeedUp }: { onSpeedUp?: () => void }) {
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
  const isLow = !isPro && units <= LOW_ENERGY_THRESHOLD;

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
    : isLow
      ? SHARK_LOW_NUDGE
      : SHARK_CHARGING_IDLE;

  const countLabel = isPro ? "∞" : `${units} / ${MAX_ENERGY}`;
  const subline = isPro
    ? "Pro — אנרגיה אינסופית"
    : isFull
      ? "אנרגיה מלאה — הזמן המושלם לשיעור"
      : countdownLabel;

  const showCta = !isPro && !isFull && !!onSpeedUp;

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
                <EnergyBatteryIcon size={22} level={isPro ? 1 : units / MAX_ENERGY} />
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

          {/* Speed-up CTA */}
          {showCta && (
            <Pressable
              onPress={() => { tapHaptic(); onSpeedUp?.(); }}
              style={styles.cta}
              accessibilityRole="button"
              accessibilityLabel="שחקו משחק קצר כדי להוסיף אנרגיה"
            >
              <Text style={styles.ctaTop}>שחק</Text>
              <Text style={styles.ctaBottom}>+אנרגיה</Text>
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
