import { useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeInDown, FadeOut, useReducedMotion } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useCompletedModulesStore } from "../economy/useCompletedModulesStore";
import { FINN_STANDARD } from "../retention-loops/finnMascotConfig";
import { captureEvent } from "../../lib/posthog";
import { tapHaptic } from "../../utils/haptics";

/** Same destination the walkthrough used to auto-launch (auto-intro flow):
 *  the topic-tree intro of mod-0-1, returning to the accordion afterwards. */
const FIRST_LESSON_ROUTE =
  "/lesson/mod-0-1?startPhase=intro&returnTo=topic-tree&chapterId=chapter-0";

/**
 * "בואו נתחיל" — the explicit first-lesson invitation that replaced the
 * auto-launch of mod-0-1 at walkthrough end (Yoav 18.8).
 *
 * WHY: the new-user funnel (27.7–9.8) showed the biggest leak is DURING the
 * mod-0-1 intro, and 7 of the 15 intro-droppers had `lesson_started` fire in
 * the very same second the tour ended — still standing on /bridge or /friends.
 * They never chose to start, so they backed straight out. A user-initiated
 * start is the cheapest fix: same route, but their tap.
 *
 * Shows on the learn map while `pendingFirstLessonCTA` is armed and mod-0-1
 * isn't done. Clears on tap, on dismiss, or once mod-0-1 completes (the user
 * found the node on their own). Not a modal — it never blocks the map, and it
 * sits outside the popup-slot queue so it can't be starved by other hosts.
 */
export function FirstLessonCTA() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const pending = useTutorialStore((s) => s.pendingFirstLessonCTA);
  const setPending = useTutorialStore((s) => s.setPendingFirstLessonCTA);
  const isWalkthroughActive = !useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const completedIds = useCompletedModulesStore((s) => s.completedIds);
  const mod01Done = completedIds.includes("mod-0-1");
  const shownRef = useRef(false);

  const visible = pending && !isWalkthroughActive && !mod01Done;

  // Self-heal: if mod-0-1 got completed while the flag was still armed
  // (user tapped the node directly), retire the flag quietly.
  useEffect(() => {
    if (pending && mod01Done) setPending(false);
  }, [pending, mod01Done, setPending]);

  useEffect(() => {
    if (!visible || shownRef.current) return;
    shownRef.current = true;
    try { captureEvent("first_lesson_cta_shown", {}); } catch { /* non-fatal */ }
  }, [visible]);

  const handleStart = useCallback(() => {
    try { tapHaptic(); } catch { /* ignore */ }
    try { captureEvent("first_lesson_cta_tapped", {}); } catch { /* non-fatal */ }
    setPending(false);
    router.push(FIRST_LESSON_ROUTE as never);
  }, [router, setPending]);

  const handleDismiss = useCallback(() => {
    try { tapHaptic(); } catch { /* ignore */ }
    try { captureEvent("first_lesson_cta_dismissed", {}); } catch { /* non-fatal */ }
    setPending(false);
  }, [setPending]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(320)}
      exiting={reducedMotion ? undefined : FadeOut.duration(180)}
      style={styles.wrap}
    >
      <View style={styles.card}>
        <Pressable
          onPress={handleDismiss}
          style={styles.closeBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="סגירה"
        >
          <X size={14} color="#0369a1" />
        </Pressable>

        <View style={styles.inner}>
          <View style={styles.textWrap}>
            <Text style={styles.title} allowFontScaling={false}>מוכנים לשיעור הראשון?</Text>
            <Text style={styles.sub}>
              3 דקות, ומתחילים לצבור מטבעות ו-XP.{"\n"}קפטן שארק כבר מחכה במפה.
            </Text>
          </View>
          <View style={styles.mascotWrap}>
            <ExpoImage
              source={FINN_STANDARD}
              accessible={false}
              style={styles.mascot}
              contentFit="contain"
            />
          </View>
        </View>

        <Pressable
          onPress={handleStart}
          accessibilityRole="button"
          accessibilityLabel="בואו נתחיל את השיעור הראשון"
          style={({ pressed }) => [styles.ctaOuter, pressed && styles.ctaPressed]}
        >
          {/* bg on an inner View — RN Pressable function-style drops
              backgroundColor on Android (house rule). */}
          <View style={styles.ctaInner}>
            <Text style={styles.ctaText} allowFontScaling={false}>בואו נתחיל</Text>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#e0f2fe",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#7dd3fc",
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    left: 8, // RTL: the corner the reading eye reaches last
    zIndex: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(3,105,161,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 12,
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0369a1",
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: 3,
  },
  sub: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#475569",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },
  mascotWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: "hidden",
  },
  mascot: { width: 84, height: 84 },
  ctaOuter: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 14,
  },
  ctaPressed: { transform: [{ scale: 0.98 }] },
  ctaInner: {
    minHeight: 48,
    backgroundColor: "#0284c7",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#0369a1",
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    writingDirection: "rtl",
  },
});
