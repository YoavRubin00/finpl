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
import { track } from "../../../../lib/analytics/events";
import { loadBarCtas, pickBarCta } from "../../../bar-content/barCtaApi";

const VIDEO_URL =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-referral.mp4";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

interface Props {
  isActive?: boolean;
  /** Pearl flow: fired when the user advances past this CTA (tap "המשך"
   *  skip only). Without this prop the card behaves like the old feed
   *  surface (CTA only, no skip). */
  onContinue?: () => void;
  /** Pearl flow: fired when the user TAPS the CTA — closes the pearl and
   *  marks it completed before this card navigates to /referral. Without
   *  it the pearl stays unlocked-forever once the CTA is tapped. */
  onTapCta?: () => void;
  /** Pearl context — threaded through for typed pearl_cta_tapped /
   *  pearl_cta_dismissed analytics. PearlCtaStage emits pearl_cta_shown. */
  afterModuleId?: string;
  chapterId?: string;
}

export const FeedReferralNudgeCard = React.memo(function FeedReferralNudgeCard({
  isActive,
  onContinue,
  onTapCta,
  afterModuleId,
  chapterId,
}: Props) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { playSound } = useSoundEffect();
  const mountedAtRef = useRef<number>(Date.now());

  // Bar's cloud CTA copy (A/B variant). Falls back to the hardcoded strings
  // below when the cloud is cold/empty; swaps in once loaded (one-time).
  const [cloudCta, setCloudCta] = useState(() => pickBarCta('referral'));
  useEffect(() => {
    if (cloudCta) return;
    let alive = true;
    loadBarCtas().then(() => { if (alive) setCloudCta(pickBarCta('referral')); });
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
        track({ name: 'pearl_cta_tapped', props: { after_module_id: afterModuleId, chapter_id: chapterId, cta_kind: 'referral', destination_url: '/referral', cta_variant: cloudCta?.variant } });
      } catch { /* non-fatal */ }
    }
    // Finalize the pearl in-place BEFORE navigating. onTapCta closes the
    // sheet + marks the pearl completed but does NOT do router.push to
    // the next module, so there's no race with our /referral push. The
    // earlier "navigate-only" approach (2026-06-01) left the pearl
    // unlocked-forever when the user tapped the CTA and never came back
    // to tap "אחר כך" (QA report 2026-06-03).
    onTapCta?.();
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

      {/* ScrollView lets the card overflow without clipping when the
          available vertical space is tight (Samsung mid-size devices
          with system gesture bar — user report 2026-06-04, card bottom
          edge cut off). On larger phones flexGrow:1 + justifyContent:
          center keeps the card visually centered as before; on smaller
          ones the scroll engages and nothing is lost. */}
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

          <Text style={[styles.title, RTL_CENTER]}>{cloudCta?.title ?? "הזמינו חברים"}</Text>
          <Text style={[styles.subtitle, RTL_CENTER]}>
            {cloudCta?.body ?? "שתפו את FinPlay עם החברים שלכם וקבלו מטבעות וגמים"}
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
              <Text style={styles.ctaText}>{cloudCta?.cta ?? "ראו איך לקבל מטבעות 🎁"}</Text>
            </Pressable>
          </Animated.View>

          {/* Pearl-flow skip — only when onContinue is wired (i.e., we're
              inside a pearl, not a standalone surface). Lets the user advance
              to the next stage without taking the CTA. Renamed from
              "המשך ←" to "אחר כך" (2026-06-03): the arrow + "המשך" read
              as forward navigation, making it the visually obvious next-step
              cue — 12 CTA shows / 0 taps in prod. Softer copy reduces the
              accidental dismiss rate. */}
          {onContinue ? (
            <Pressable
              onPress={handleSkip}
              accessibilityRole="button"
              accessibilityLabel="דלג לשלב הבא"
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
  // Tertiary "אחר כך" — visually muted so it doesn't compete with the
  // primary CTA. Previous styling read as a co-equal action and lost
  // 100% of CTA conversions in prod (12 shown / 0 tapped → all hit skip).
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 6,
    borderRadius: 12,
  },
  skipText: {
    color: "rgba(186, 230, 253, 0.7)",
    fontSize: 13,
    fontWeight: "600",
    writingDirection: "rtl",
  },
});
