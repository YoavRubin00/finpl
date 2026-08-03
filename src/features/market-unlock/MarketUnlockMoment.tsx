import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import LottieView from "lottie-react-native";
import { TrendingUp, X } from "lucide-react-native";
import { ParticleBurst } from "../../components/ui/ParticleBurst";
import { heavyHaptic, mediumHaptic, successHaptic, tapHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { captureEvent } from "../../lib/posthog";

/**
 * MarketUnlockMoment — one-time full-screen takeover shown the moment the
 * capital-markets chapter ("צמיחה") unlocks for a user (Yoav 3.8.26: "אני
 * רוצה שלכל משתמש יפתח שוק ההון... שזה יקפוץ להם בחוויית משתמש מדהימה
 * שלוקחים אותם לפרק של צמיחה (שוק ההון)").
 *
 * Brawl-Stars-style unlock beat: a vault "gate" splits open to reveal a
 * rising growth chart + a celebrating Captain Shark, then the CTA invites
 * the user straight into the growth chapter (stocks / indices / ETFs).
 *
 * Fully decoupled from navigation/state — pure presentation:
 *  - `visible`   — host controls when to render the takeover.
 *  - `onEnter`   — user tapped the primary CTA; host handles navigation.
 *  - `onDismiss` — gentle close (X button, tap-outside, or hardware back);
 *                  host just hides it, no navigation.
 * Marking the moment "seen" (useMarketUnlockStore.markSeen) is the host's
 * responsibility too — this component never touches that store, so it stays
 * reusable/testable in isolation.
 *
 * Perf: transform/opacity only (60fps, UI thread). Respects useReducedMotion
 * with a fully static fallback. Timeline is tuned so the CTA is tappable
 * well under the 2.5s "wow but fast" budget (~1.3s to CTA-ready).
 */

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

// Timeline (ms) — non-reduced-motion path.
const GATE_OPEN_DELAY = 260;
const GATE_OPEN_DURATION = 420;
const GLOW_DELAY = 260;
const CHART_DELAY = 320;
const MASCOT_DELAY = 460;
const BURST_DELAY = 620;
const TITLE_DELAY = 700;
const SUBTITLE_DELAY = 850;
const CTA_DELAY = 1050;
const CTA_DURATION = 280; // CTA is tappable ~1330ms after visible — well under the 2.5s budget.
const DISMISS_BTN_DELAY = 180;

interface MarketUnlockMomentProps {
  visible: boolean;
  /** User tapped the primary CTA ("קחו אותי לשם") — host navigates to the
   *  growth chapter (שוק ההון). Fires `market_unlock_moment_entered` first. */
  onEnter: () => void;
  /** Gentle dismiss (X button / tap outside / hardware back). Never traps
   *  the user. Fires `market_unlock_moment_dismissed` first. */
  onDismiss: () => void;
}

export function MarketUnlockMoment({
  visible,
  onEnter,
  onDismiss,
}: MarketUnlockMomentProps): React.ReactElement | null {
  const reduceMotion = useReducedMotion();
  const { width: screenWidth } = useWindowDimensions();
  const { playSound } = useSoundEffect();

  // The gate panels are removed from the tree once they've fully opened —
  // no reason to keep two full-screen views mounted for the rest of the
  // moment's lifetime.
  const [gateVisible, setGateVisible] = useState(true);
  const [burstActive, setBurstActive] = useState(false);

  const shownFiredRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // market_unlock_moment_shown — once per mount, on the first visible paint.
  useEffect(() => {
    if (!visible || shownFiredRef.current) return;
    shownFiredRef.current = true;
    try {
      captureEvent("market_unlock_moment_shown", {});
    } catch {
      /* non-fatal */
    }
  }, [visible]);

  const gateProgress = useSharedValue(reduceMotion ? 1 : 0);
  const glowOpacity = useSharedValue(reduceMotion ? 0.55 : 0);
  const glowScale = useSharedValue(reduceMotion ? 1 : 0.5);
  const chartOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const chartScale = useSharedValue(reduceMotion ? 1 : 0.6);
  const mascotOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const mascotScale = useSharedValue(reduceMotion ? 1 : 0.8);

  const finishGate = useCallback(() => {
    setGateVisible(false);
  }, []);

  // Escalating haptic + one-shot timers — mirrors the chest-open beat
  // (ChestCelebrationModal.handleChestTap). Tracked so a mid-sequence
  // dismiss cancels anything still pending.
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    if (!visible) {
      clearTimers();
      setGateVisible(true);
      setBurstActive(false);
      // Reset shared values so a future re-show (host re-triggers visible)
      // replays the full reveal instead of starting mid-animation.
      gateProgress.value = reduceMotion ? 1 : 0;
      glowOpacity.value = reduceMotion ? 0.55 : 0;
      glowScale.value = reduceMotion ? 1 : 0.5;
      chartOpacity.value = reduceMotion ? 1 : 0;
      chartScale.value = reduceMotion ? 1 : 0.6;
      mascotOpacity.value = reduceMotion ? 1 : 0;
      mascotScale.value = reduceMotion ? 1 : 0.8;
      return;
    }

    if (reduceMotion) {
      // Static, respectful fallback: everything present immediately, a
      // single soft confirmation haptic, no gate/particle motion.
      try {
        playSound("modal_open_4");
      } catch {
        /* non-fatal */
      }
      timersRef.current.push(setTimeout(() => successHaptic(), 60));
      return () => clearTimers();
    }

    try {
      playSound("modal_open_4");
    } catch {
      /* non-fatal */
    }

    // T0: the gate begins to split.
    timersRef.current.push(setTimeout(() => mediumHaptic(), 0));
    gateProgress.value = withDelay(
      GATE_OPEN_DELAY,
      withTiming(1, { duration: GATE_OPEN_DURATION, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(finishGate)();
      }),
    );
    timersRef.current.push(setTimeout(() => heavyHaptic(), GATE_OPEN_DELAY + 80));

    // Glow bloom, synced with the gate splitting open.
    glowOpacity.value = withDelay(GLOW_DELAY, withTiming(0.55, { duration: 380 }));
    glowScale.value = withDelay(GLOW_DELAY, withSpring(1, { damping: 14, stiffness: 140 }));

    // Chart rises into the widening gap.
    chartOpacity.value = withDelay(CHART_DELAY, withTiming(1, { duration: 280 }));
    chartScale.value = withDelay(CHART_DELAY, withSpring(1, { damping: 14, stiffness: 150 }));

    // Mascot springs in with a small overshoot (anticipation + follow-through).
    mascotOpacity.value = withDelay(MASCOT_DELAY, withTiming(1, { duration: 260 }));
    mascotScale.value = withDelay(
      MASCOT_DELAY,
      withSequence(
        withSpring(1.06, { damping: 12, stiffness: 180 }),
        withSpring(1, { damping: 14, stiffness: 150 }),
      ),
    );

    // T: reveal complete — coin burst + confirmation haptic.
    timersRef.current.push(
      setTimeout(() => {
        if (!mountedRef.current) return;
        setBurstActive(true);
        successHaptic();
      }, BURST_DELAY),
    );

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  const handleEnter = useCallback(() => {
    tapHaptic();
    try {
      captureEvent("market_unlock_moment_entered", {});
    } catch {
      /* non-fatal */
    }
    onEnter();
  }, [onEnter]);

  const handleDismiss = useCallback(() => {
    tapHaptic();
    try {
      captureEvent("market_unlock_moment_dismissed", {});
    } catch {
      /* non-fatal */
    }
    onDismiss();
  }, [onDismiss]);

  const gateLeftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(gateProgress.value, [0, 1], [0, -screenWidth * 0.62]) }],
  }));
  const gateRightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(gateProgress.value, [0, 1], [0, screenWidth * 0.62]) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));
  const chartStyle = useAnimatedStyle(() => ({
    opacity: chartOpacity.value,
    transform: [{ scale: chartScale.value }],
  }));
  const mascotStyle = useAnimatedStyle(() => ({
    opacity: mascotOpacity.value,
    transform: [{ scale: mascotScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleDismiss}>
      {/* Backdrop doubles as the "tap outside to close" target. Interactive
          children (X button, CTA) claim the touch responder before it
          bubbles here, so tapping them never also fires this dismiss. */}
      <Pressable
        style={styles.backdrop}
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="סגירה"
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.delay(DISMISS_BTN_DELAY).duration(220)}
            style={styles.dismissWrap}
          >
            <Pressable
              onPress={handleDismiss}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel="סגירה"
              style={styles.dismissBtn}
            >
              <X size={20} color="rgba(224,242,254,0.8)" strokeWidth={2.4} />
            </Pressable>
          </Animated.View>

          <View style={styles.stage}>
            <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />

            <Animated.View style={[styles.chartWrap, chartStyle]} pointerEvents="none">
              <LottieView
                source={require("../../../assets/lottie/wired-flat-152-bar-chart-arrow-hover-growth.json")}
                autoPlay
                loop={false}
                style={styles.chartLottie}
              />
            </Animated.View>

            <Animated.View style={[styles.mascotWrap, mascotStyle]} pointerEvents="none">
              <ExpoImage
                source={require("../../../assets/webp/fin-victory-hi.webp")}
                style={styles.mascot}
                contentFit="contain"
                accessible={false}
              />
            </Animated.View>

            {burstActive && !reduceMotion && (
              <View style={styles.burstAbs} pointerEvents="none">
                <ParticleBurst color="gold" particleCount={16} onComplete={() => setBurstActive(false)} />
              </View>
            )}

            {/* Vault gate — two panels that split open to reveal the scene.
                Unmounted once fully open (finishGate) to keep the tree light. */}
            {gateVisible && !reduceMotion && (
              <>
                <Animated.View pointerEvents="none" style={[styles.gatePanel, styles.gatePanelLeft, gateLeftStyle]}>
                  <View style={styles.gateSeam} />
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.gatePanel, styles.gatePanelRight, gateRightStyle]}>
                  <View style={styles.gateSeam} />
                </Animated.View>
              </>
            )}
          </View>

          <View style={styles.textWrap}>
            <Animated.View entering={reduceMotion ? undefined : FadeInUp.delay(TITLE_DELAY).duration(320)}>
              <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
                שוק ההון נפתח בשבילכם
              </Text>
            </Animated.View>
            <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(SUBTITLE_DELAY).duration(280)}>
              <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                פרק צמיחה מחכה לכם: מניות, מדדים ותעודות סל
              </Text>
            </Animated.View>
          </View>

          <Animated.View
            entering={reduceMotion ? undefined : FadeInUp.delay(CTA_DELAY).duration(CTA_DURATION)}
            style={styles.ctaWrap}
          >
            <Pressable
              onPress={handleEnter}
              accessibilityRole="button"
              accessibilityLabel="קחו אותי לשם"
              style={styles.cta}
            >
              <TrendingUp size={22} color="#ffffff" strokeWidth={2.6} />
              <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                קחו אותי לשם
              </Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.95)",
  },
  safe: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  dismissWrap: {
    alignItems: "flex-end",
  },
  dismissBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(224,242,254,0.08)",
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(34, 211, 238, 0.35)",
    shadowColor: "#22d3ee",
    shadowOpacity: 0.9,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  chartWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  chartLottie: {
    width: 220,
    height: 220,
  },
  mascotWrap: {
    position: "absolute",
    bottom: -16,
    alignItems: "center",
    justifyContent: "center",
  },
  mascot: {
    width: 132,
    height: 132,
  },
  burstAbs: {
    position: "absolute",
    top: "38%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 15,
  },
  gatePanel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "52%",
    backgroundColor: "#020617",
  },
  gatePanelLeft: {
    left: 0,
    alignItems: "flex-end",
  },
  gatePanelRight: {
    right: 0,
    alignItems: "flex-start",
  },
  gateSeam: {
    width: 2,
    height: "100%",
    backgroundColor: "rgba(34, 211, 238, 0.55)",
  },
  textWrap: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#f0f9ff",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a5f3fc",
    maxWidth: 300,
    lineHeight: 22,
  },
  ctaWrap: {
    paddingBottom: 12,
    paddingTop: 20,
  },
  cta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#0891b2",
    borderBottomWidth: 4,
    borderBottomColor: "#155e75",
    shadowColor: "#22d3ee",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
  },
});
