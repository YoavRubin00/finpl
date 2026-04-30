import React, { useEffect } from "react";
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
import { tapHaptic, successHaptic } from "../../utils/haptics";
import { useSoundEffect } from "../../hooks/useSoundEffect";
import { trackBridgeClick } from "../../utils/trackBridgeClick";
import { useAuthStore } from "../auth/useAuthStore";

const VIDEO_URL =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/finn-videos/finn-trading-start.mp4";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RTL_CENTER = { writingDirection: "rtl" as const, textAlign: "center" as const };

export const FeedTradingNudgeCard = React.memo(function FeedTradingNudgeCard({
  isActive,
}: {
  isActive?: boolean;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const userEmail = useAuthStore((s) => s.email);
  const { playSound } = useSoundEffect();

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

  // Pulsing CTA glow
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
    trackBridgeClick("feed-trading-nudge", "link_open", userEmail);
    router.push("/bridge" as never);
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

        <Text style={[styles.title, RTL_CENTER]}>ידע לבד לא מספיק</Text>
        <Text style={[styles.subtitle, RTL_CENTER]}>
          הגיע הזמן לפעול. הגשר מחבר את הלמידה לעולם האמיתי
        </Text>

        <Animated.View
          entering={FadeInUp.delay(280).duration(360)}
          style={[styles.ctaGlow, glowStyle]}
        >
          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel="בואו לגשר — לפתוח חשבון מסחר"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>בואו לגשר</Text>
          </Pressable>
        </Animated.View>
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
  videoWrap: {
    width: 220,
    height: 391,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(8, 47, 73, 0.7)",
  },
  video: { width: "100%", height: "100%" },
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
    shadowColor: "#2563eb",
    shadowOpacity: 0.7,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
    marginTop: 4,
  },
  cta: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderBottomWidth: 4,
    borderBottomColor: "#1d4ed8",
  },
  ctaPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  ctaText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
    writingDirection: "rtl",
  },
});
