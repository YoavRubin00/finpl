import { useCallback, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, { FadeInDown, FadeOut, useReducedMotion } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { X } from "lucide-react-native";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useCompletedModulesStore } from "../economy/useCompletedModulesStore";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { captureEvent } from "../../lib/posthog";
import { tapHaptic } from "../../utils/haptics";
import { BANNER_PRIORITY, useBannerSlot } from "../../stores/useBannerSlotStore";
import { useIsPro } from "./useSubscription";
import { useUsageStore } from "./useUsageStore";
import { israelDayKey } from "../../utils/dateUtils";
import { useTopicProgressStore } from "../topic-learning/useTopicProgressStore";

/** Completed modules before the trial offer appears: 1 (Yoav 18.10.26). 5 of the
 *  8 trials ever started on day 0, and 17 of 38 chest-openers stop after a single
 *  module — any higher threshold hides the offer from exactly the people who buy.
 *  History: 3 → 2 (17.10.26): of the 38 learners who opened any chest in 14 days,
 *  17 stopped at one and 9 at two — a threshold of 3 hid the offer from 26 of
 *  38 engaged users (68%). At 2 it reaches 21 of 38. Meanwhile only 2 of 46 new
 *  users ever reached the pricing screen, so the problem was never that the
 *  offer came too early; it was that it never arrived at all. */
const CHESTS_BEFORE_OFFER = 1;

/** A dismissal hides the banner for 3 days; the 3rd dismissal ends it. */
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_DISMISSALS = 3;

/** One impression every 3 Israeli days (was: every day). Two months of this
 *  offer: 255 paywall views, 51 people, 0 subscriptions - the same few users
 *  met it again and again. Fewer, better-timed impressions. */
const MIN_DAYS_BETWEEN_IMPRESSIONS = 3;
/** Quiet window after a lesson chest. The user has just been pointed at the
 *  next lesson; an offer card on top of the map at that second competes with
 *  it. The banner belongs to the moments in between (app open, browsing). */
const POST_LESSON_QUIET_MS = 10 * 60 * 1000;

/** True once the banner took its impression in THIS app session. See the
 *  self-hiding bug note in the component. Session-only on purpose. */
let shownThisSession = false;

function daysBetween(fromDay: string | null, toDay: string): number {
  if (!fromDay) return Number.POSITIVE_INFINITY;
  const from = Date.parse(`${fromDay}T12:00:00Z`);
  const to = Date.parse(`${toDay}T12:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return Number.POSITIVE_INFINITY;
  return Math.round((to - from) / 86_400_000);
}

/**
 * Soft Pro invitation on the learn map after the 3rd chest (Yoav 11.10.26).
 *
 * Replaces the two FORCED paywalls (post-mod-0-1b, post-mod-0-4): 34 viewers
 * in 60 days, 0 purchases, and every new user learned to tap "ליציאה" before
 * they had any reason to want Pro. This one never blocks anything, sits in the
 * banner slot below streak/first-lesson nudges, and is gone after one dismiss.
 */
export function ThirdChestProBanner() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const isPro = useIsPro();
  const isWalkthroughActive = !useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const completedIds = useCompletedModulesStore((s) => s.completedIds);
  const dismissCount = useUsageStore((s) => s.thirdChestProBannerDismissCount);
  const dismissedAt = useUsageStore((s) => s.thirdChestProBannerDismissedAt);
  const markDismissed = useUsageStore((s) => s.markThirdChestProBannerDismissed);
  const markShownToday = useUsageStore((s) => s.markProBannerShownToday);
  const lastShownDate = useUsageStore((s) => s.proBannerLastShownDate);

  // One impression per MIN_DAYS_BETWEEN_IMPRESSIONS, not one per mount: the
  // learn map remounts this constantly, so the banner used to reappear (and
  // re-report) all day long — 145 reports from 21 users, one of them 39 times.
  //
  // BUG FIXED HERE (13.11.26): the old gate was `!alreadyShownToday`, and the
  // impression effect below stamps today the first time the banner is visible.
  // So the stamp flipped the banner's own gate on the very next render and it
  // unmounted a frame after appearing: `pro_banner_shown` kept counting
  // (319 from 65 people) for a card nobody had time to read or tap. The cap
  // now decides whether a NEW impression may start; once this session took
  // its impression, the banner stays for the session.
  const capAllows = shownThisSession || daysBetween(lastShownDate, israelDayKey()) >= MIN_DAYS_BETWEEN_IMPRESSIONS;
  // Never in the lesson → next-lesson path: quiet right after a chest.
  const lastChestAtMs = useTopicProgressStore((s) => s.lastChestAtMs);
  const justFinishedLesson = lastChestAtMs > 0 && Date.now() - lastChestAtMs < POST_LESSON_QUIET_MS;
  // Users who dismissed under the old "gone forever" rule have no timestamp and
  // no count, so they see the offer again — intended, they never got a second look.
  const dismissedRecently = dismissedAt != null && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
  const wants =
    !isPro
    && dismissCount < MAX_DISMISSALS
    && !dismissedRecently
    && !isWalkthroughActive
    && capAllows
    && !justFinishedLesson
    && completedIds.length >= CHESTS_BEFORE_OFFER;
  const visible = useBannerSlot("third_chest_pro", wants, BANNER_PRIORITY.thirdChestPro);

  useEffect(() => {
    if (!visible) return;
    // One report per session: the module-level flag survives the map's
    // remounts, and the persisted day-stamp starts the 3-day cap.
    if (shownThisSession) return;
    shownThisSession = true;
    markShownToday();
    // NOT `paywall_viewed`: a banner impression is not a paywall view, and
    // mixing them made this banner the app's top "paywall source" while the
    // real pricing screen saw 3 users in six days. Its own event keeps the
    // purchase funnel honest.
    try { captureEvent("pro_banner_shown", { source: "third_chest_banner", chests: completedIds.length }); } catch { /* non-fatal */ }
  }, [visible, markShownToday, completedIds.length]);

  const handleOpen = useCallback(() => {
    try { tapHaptic(); } catch { /* ignore */ }
    try { captureEvent("paywall_cta_tapped", { source: "third_chest_banner" }); } catch { /* non-fatal */ }
    router.push("/pricing?source=third_chest_banner" as never);
  }, [router]);

  const handleDismiss = useCallback(() => {
    try { tapHaptic(); } catch { /* ignore */ }
    try { captureEvent("pro_banner_dismissed", { source: "third_chest_banner" }); } catch { /* non-fatal */ }
    markDismissed();
  }, [markDismissed]);

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
          <X size={14} color="#92400e" />
        </Pressable>

        <View style={styles.inner}>
          <View style={styles.textWrap}>
            <Text style={styles.title} allowFontScaling={false}>סיימתם שיעור. מוכנים ליותר?</Text>
            <Text style={styles.sub}>
              אנרגיה בלי סוף, בלי פרסומות, וצ'אט חופשי עם שארק.{"\n"}7 ימים חינם, ביטול בכל רגע.
            </Text>
          </View>
          <View style={styles.mascotWrap}>
            <ExpoImage source={FINN_HAPPY} accessible={false} style={styles.mascot} contentFit="contain" />
          </View>
        </View>

        <Pressable
          onPress={handleOpen}
          accessibilityRole="button"
          accessibilityLabel="להתחיל 7 ימים חינם של Pro"
          style={({ pressed }) => [styles.ctaOuter, pressed && styles.ctaPressed]}
        >
          {/* bg on an inner View — RN Pressable function-style drops
              backgroundColor on Android (house rule). */}
          <View style={styles.ctaInner}>
            <Text style={styles.ctaText} allowFontScaling={false}>להתחיל 7 ימים חינם</Text>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 4, marginBottom: 8 },
  card: {
    backgroundColor: "#fffbeb",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#fcd34d",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(146,64,14,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6, gap: 12 },
  textWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: "900", color: "#92400e", textAlign: "right", writingDirection: "rtl", marginBottom: 3 },
  sub: { fontSize: 12.5, fontWeight: "600", color: "#475569", textAlign: "right", writingDirection: "rtl", lineHeight: 18 },
  mascotWrap: { width: 76, height: 76, borderRadius: 38, overflow: "hidden" },
  mascot: { width: 76, height: 76 },
  ctaOuter: { marginHorizontal: 14, marginBottom: 12, borderRadius: 14 },
  ctaPressed: { transform: [{ scale: 0.98 }] },
  ctaInner: {
    minHeight: 46,
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#b45309",
  },
  ctaText: { color: "#ffffff", fontSize: 15, fontWeight: "900", writingDirection: "rtl" },
});
