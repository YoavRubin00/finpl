import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions } from "react-native";
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
import { track } from "../../../../lib/analytics/events";

const VIDEO_URL =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-referral.mp4";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

interface Props {
  isActive?: boolean;
  /** Pearl flow: fired when the user advances past this CTA (tap CTA OR
   *  tap "המשך" skip). Without this prop the card behaves like the old
   *  feed surface (CTA only, no skip). */
  onContinue?: () => void;
  /** Pearl context — threaded through for typed pearl_cta_tapped /
   *  pearl_cta_dismissed analytics. PearlCtaStage emits pearl_cta_shown. */
  afterModuleId?: string;
  chapterId?: string;
}

export const FeedReferralNudgeCard = React.memo(function FeedReferralNudgeCard({
  isActive,
  onContinue,
  afterModuleId,
  chapterId,
}: Props) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { playSound } = useSoundEffect();
  const mountedAtRef = useRef<number>(Date.now());

  const player = useVideoPlayer(VIDEO_URL, (p) => {
    p.loop = true;
    p.muted = true;
    p.bufferOptions = {
      preferredForwardBufferDuration: 5,
      waitsToMinimizeStalling: false,
      minBufferForPlayback: 0.5,
    };
  });

  useEffect(() => {
    if (isActive ?? true) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  const glow = useSharedValue(0.6);
  useEffect(() => {
    if (reducedMotion) {
      glow.value = 1;
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 950 }),
        withTiming(0.55, { duration: 950 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glow);
  }, [glow, reducedMotion]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const handlePress = () => {
    tapHaptic();
    playSound("btn_click_soft_2");
    successHaptic();
    if (afterModuleId) {
      try {
        track({ name: 'pearl_cta_tapped', props: { after_module_id: afterModuleId, chapter_id: chapterId, cta_kind: 'referral', destination_url: '/referral' } });
      } catch { /* non-fatal */ }
    }
    // DON'T advance the pearl here. The previous version called onContinue()
    // immediately after router.push, which raced the navigation: if this was
    // the last pearl stage the pager would close → trigger the next-module
    // open, which overrode the /referral push. User would tap "הזמינו חברים"
    // and land on the next module instead of /referral (reported 2026-06-01).
    // Navigate only; user can return + tap "המשך" to advance the pearl.
    router.push("/referral" as never);
  };

  const handleSkip = () => {
    tapHaptic();
    if (afterModuleId) {
      try {
        track({ name: 'pearl_cta_dismissed', props: { after_module_id: afterModuleId, chapter_id: chapterId, cta_kind: 'referral', time_open_ms: Date.now() - mountedAtRef.current } });
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

      <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
        <View style={styles.videoWrap} accessible={false}>
          <VideoView
            player={player}
            style={styles.video}
            nativeControls={false}
            contentFit="cover"
          />
        </View>

        <Text style={[styles.title, RTL_CENTER]}>הזמינו חברים</Text>
        <Text style={[styles.subtitle, RTL_CENTER]}>
          שתפו את FinPlay עם החברים שלכם וקבלו מטבעות וגמים
        </Text>

        <Animated.View
          entering={FadeInUp.delay(280).duration(360)}
          style={[styles.ctaGlow, glowStyle]}
        >
          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel="הזמינו חברים — קבלו פרסים"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>הזמינו חברים</Text>
          </Pressable>
        </Animated.View>

        {/* Pearl-flow skip — only when onContinue is wired (i.e., we're
            inside a pearl, not a standalone surface). Lets the user advance
            to the next stage without taking the CTA. */}
        {onContinue ? (
          <Pressable
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="המשך לשלב הבא"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>המשך ←</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.35)",
    alignItems: "center",
    gap: 14,
  },
  // Bottom 10% of the video frame is clipped — the source clip has dead
  // space / a watermark at the bottom. Container is shrunk; the inner
  // video still renders at its full intended height (391) but the wrapper's
  // overflow:hidden + flex-start alignment chops off the bottom band.
  videoWrap: {
    width: 220,
    height: 352, // 391 × 0.9 — visible region
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(8, 47, 73, 0.7)",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  video: { width: 220, height: 391 },
  title: {
    color: "#f0f9ff",
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    color: "#bae6fd",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  ctaGlow: {
    shadowColor: "#1d4ed8",
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
    marginTop: 4,
  },
  // Primary CTA — same deep blue palette used for "אני אסתדר" (TimelineOrderCard)
  // and Continue buttons across the app. Solid fill, bottom border 4px for the
  // Duo-style 3D lift, no thin outline (those make the button read as "outline only"
  // against the dark pearl gradient → user feedback 2026-06-01).
  cta: {
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderBottomWidth: 4,
    borderBottomColor: "#1e3a8a",
  },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  ctaText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
    writingDirection: "rtl",
  },
  // Secondary "המשך" — lighter blue + filled (matches "עזור לי" in TimelineOrderCard).
  // Was a near-invisible text-only link; user couldn't tell it was tappable.
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "rgba(56, 189, 248, 0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(56, 189, 248, 0.55)",
  },
  skipText: {
    color: "#bae6fd",
    fontSize: 14,
    fontWeight: "800",
    writingDirection: "rtl",
  },
});
