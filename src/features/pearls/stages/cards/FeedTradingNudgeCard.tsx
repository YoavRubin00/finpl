import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, ScrollView } from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useRouter } from "expo-router";
import { tapHaptic, successHaptic } from "../../../../utils/haptics";
import { useSoundEffect } from "../../../../hooks/useSoundEffect";
import { trackBridgeClick } from "../../../../utils/trackBridgeClick";
import { useAuthStore } from "../../../auth/useAuthStore";
import { track } from "../../../../lib/analytics/events";
import { loadBarCtas, pickBarCta } from "../../../bar-content/barCtaApi";

const VIDEO_URL =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-trading-start.mp4";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

interface Props {
  isActive?: boolean;
  /** Pearl flow: advance to the next stage on skip ("המשך"). */
  onContinue?: () => void;
  /** Pearl flow: fired when the user TAPS the CTA — closes the pearl and
   *  marks it completed before this card navigates to /bridge. Without
   *  it the pearl stays unlocked-forever once the CTA is tapped. */
  onTapCta?: () => void;
  /** Pearl context — threaded through for typed pearl_cta_tapped /
   *  pearl_cta_dismissed analytics. PearlCtaStage emits pearl_cta_shown. */
  afterModuleId?: string;
  chapterId?: string;
}

export const FeedTradingNudgeCard = React.memo(function FeedTradingNudgeCard({
  isActive,
  onContinue,
  onTapCta,
  afterModuleId,
  chapterId,
}: Props) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const userEmail = useAuthStore((s) => s.email);
  const { playSound } = useSoundEffect();
  const mountedAtRef = useRef<number>(Date.now());

  // Bar's cloud CTA copy (A/B variant). Falls back to the hardcoded strings
  // below when the cloud is cold/empty; swaps in once loaded (one-time).
  const [cloudCta, setCloudCta] = useState(() => pickBarCta('trading'));
  useEffect(() => {
    if (cloudCta) return;
    let alive = true;
    loadBarCtas().then(() => { if (alive) setCloudCta(pickBarCta('trading')); });
    return () => { alive = false; };
  }, [cloudCta]);

  const player = useVideoPlayer(VIDEO_URL, (p) => {
    p.loop = true;
    p.muted = true;
    p.bufferOptions = {
      preferredForwardBufferDuration: 5,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 0.5,
    };
  });

  // Auto-play when active (driven by FinFeedScreen viewability tracking)
  useEffect(() => {
    if (isActive ?? true) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  // Pulsing CTA — was opacity-based (0.55 ↔ 1) which faded the blue
  // background on the dark card and made the button read as "just white text"
  // (user report 2026-06-03). Switched to a subtle scale pulse that keeps
  // the blue fully visible at all times.
  const glow = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) {
      glow.value = 1;
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 950 }),
        withTiming(1, { duration: 950 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glow);
  }, [glow, reducedMotion]);
  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }] }));

  const handlePress = () => {
    tapHaptic();
    playSound("btn_click_soft_2");
    successHaptic();
    trackBridgeClick("feed-trading-nudge", "link_open", userEmail);
    if (afterModuleId) {
      try {
        track({ name: 'pearl_cta_tapped', props: { after_module_id: afterModuleId, chapter_id: chapterId, cta_kind: 'trading', destination_url: '/bridge', cta_variant: cloudCta?.variant } });
      } catch { /* non-fatal */ }
    }
    // Finalize the pearl in-place BEFORE navigating. onTapCta closes the
    // sheet + marks the pearl completed but does NOT do router.push to
    // the next module, so there's no race with our /bridge push. We
    // tried "navigate-only" earlier (no pearl-state update) but that
    // left the pearl unlocked-forever (QA report 2026-06-03). Skip path
    // (handleSkip below) still calls onContinue for the standard advance.
    onTapCta?.();
    router.push("/bridge" as never);
  };
  const handleSkip = () => {
    tapHaptic();
    if (afterModuleId) {
      try {
        track({ name: 'pearl_cta_dismissed', props: { after_module_id: afterModuleId, chapter_id: chapterId, cta_kind: 'trading', time_open_ms: Date.now() - mountedAtRef.current } });
      } catch { /* non-fatal */ }
    }
    onContinue?.();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0c4a6e", "#0369a1", "#075985"]}
        style={StyleSheet.absoluteFill}
      />

      {/* ScrollView prevents the 220x391 video + title + subtitle + CTA
          + skip from overflowing the viewport on tighter Android phones
          (user report 2026-06-04: "הפריים יוצא מהמסך"). flexGrow + center
          keeps the card visually centered when there's room, switches to
          scroll when there isn't. Mirrors FeedReferralNudgeCard pattern. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
          <View style={styles.videoWrap} accessible={false}>
            <VideoView
              player={player}
              style={styles.video}
              nativeControls={false}
              contentFit="cover"
            />
          </View>

          <Text style={[styles.title, RTL_CENTER]}>{cloudCta?.title ?? "ידע לבד לא מספיק"}</Text>
          <Text style={[styles.subtitle, RTL_CENTER]}>
            {cloudCta?.body ?? "הגיע הזמן לפעול. הגשר מחבר את הלמידה לעולם האמיתי"}
          </Text>

          {/* CTA bg/border live on an inner View — Pressable's function-style
              style prop drops the backgroundColor on Android, leaving white
              text on a transparent card with no visible button (user report
              2026-06-04: "הכפתור בואו לגשר צריך להיות בצבע כחול ונראה"). Same
              workaround as LoadingBubble / PearlScenarioStage CTAs. */}
          <Animated.View
            entering={FadeInUp.delay(280).duration(360)}
            style={[styles.ctaGlow, glowStyle]}
          >
            <Pressable
              onPress={handlePress}
              accessibilityRole="button"
              accessibilityLabel="בואו לגשר — לפתוח חשבון מסחר"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {({ pressed }) => (
                <View style={[styles.cta, pressed && styles.ctaPressed]}>
                  <Text style={styles.ctaText}>{cloudCta?.cta ?? "בואו לגשר"}</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

          {/* Pearl-flow skip — only visible when wired (i.e., we're inside a
              pearl, not a standalone surface). Advances to next stage without
              taking the CTA. */}
          {onContinue ? (
            <Pressable
              onPress={handleSkip}
              accessibilityRole="button"
              accessibilityLabel="המשך לשלב הבא"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.skipBtn}
            >
              <Text style={styles.skipText}>אחר כך</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
});

// Modest ~10% zoom-out across the card (user request 2026-06-05: "תצמצם
// בטיפה את המסך... זום אאוט קטן"). The card was triggering a few px of
// vertical scroll on common Android viewports because the 220×391 video +
// 24pt title + 16pt CTA padding combined to just exceed the pearl pager
// height. Shrinking each ingredient by ~10% gets everything visible at
// once on the same phones without losing readability or impact.
const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.35)",
    alignItems: "center",
    gap: 10,
  },
  videoWrap: {
    width: 198,
    height: 352,
    borderRadius: 18,
    overflow: "hidden",
  },
  video: { width: "100%", height: "100%" },
  title: {
    color: "#f0f9ff",
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: "#bae6fd",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  ctaGlow: {
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
    marginTop: 2,
  },
  cta: {
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderBottomWidth: 4,
    borderBottomColor: "#0369a1",
  },
  ctaPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  ctaText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.5,
    writingDirection: "rtl",
  },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 14, marginTop: 2 },
  skipText: { color: "rgba(186,230,253,0.7)", fontSize: 13, fontWeight: "700", writingDirection: "rtl" as const },
});
