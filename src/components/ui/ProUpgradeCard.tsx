import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "./AnimatedPressable";
import { LottieIcon } from "./LottieIcon";

/**
 * THE canonical "שדרג ל-PRO" premium card — dark teal gradient, gold PRO badge,
 * Lottie crown, scattered stars, pulsing gold border. Single source of truth so
 * every upgrade CTA (profile, breaking-news, …) looks IDENTICAL (Yoav 2026-06-17:
 * "כמו הכרטיס המהודר בפרופיל"). Extracted from ProfileScreen. Only the headline
 * + onPress vary per surface.
 */
const PRO_LOTTIE = require("../../../assets/lottie/Pro Animation 3rd.json");
const STAR_TOP = [8, 16, 6, 22, 12];
const STAR_LEFT = [12, 60, 130, 200, 260];

export function ProUpgradeCard({
  onPress,
  headline,
  tagline = "✦ ללא הגבלות ✦ בלעדי לחברים ✦",
  active = true,
  accessibilityLabel = "שדרג ל-PRO",
}: {
  onPress: () => void;
  /** The white middle line — surface-specific (e.g. "לבבות אינסופיים + בוסט XP"). */
  headline: string;
  tagline?: string;
  /** Drive the Lottie autoplay (pass screen focus to pause off-screen). */
  active?: boolean;
  accessibilityLabel?: string;
}) {
  const reduceMotion = useReducedMotion();
  const proBorderOpacity = useSharedValue(reduceMotion ? 0.7 : 0.4);

  useEffect(() => {
    if (reduceMotion) return;
    proBorderOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 }),
      ),
      -1,
      true,
    );
    return () => { cancelAnimation(proBorderOpacity); };
  }, [reduceMotion, proBorderOpacity]);

  const proBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(250,204,21,${proBorderOpacity.value})`,
    shadowOpacity: proBorderOpacity.value * 0.5,
  }));

  return (
    <AnimatedPressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <Animated.View style={[styles.proCard, proBorderStyle]}>
        <LinearGradient
          colors={["#0a2540", "#164e63", "#0a2540"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 16, overflow: "hidden" }}
        >
          {["✦", "✦", "✦", "✦", "✦"].map((s, i) => (
            <Text
              key={i}
              style={{
                position: "absolute",
                color: i % 2 === 0 ? "#facc15" : "#67e8f9",
                fontSize: i === 2 ? 10 : 7,
                opacity: 0.6,
                top: STAR_TOP[i],
                left: STAR_LEFT[i],
              }}
            >{s}</Text>
          ))}
          <View style={styles.row}>
            <View style={styles.leftGroup}>
              <View style={styles.lottieBox} accessible={false}>
                <LottieIcon source={PRO_LOTTIE} size={40} autoPlay loop active={active} />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.label}>שדרגו ל-PRO</Text>
                <Text style={styles.headline}>{headline}</Text>
                <Text style={styles.tagline}>{tagline}</Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PRO</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  proCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  leftGroup: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  lottieBox: {
    width: 48,
    height: 48,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "rgba(14,116,144,0.3)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: "#facc15", textTransform: "uppercase" },
  headline: { fontSize: 15, fontWeight: "700", color: "#ffffff", marginTop: 2 },
  tagline: { fontSize: 11, color: "rgba(103,232,249,0.8)", marginTop: 2 },
  badge: {
    borderRadius: 20,
    backgroundColor: "rgba(250,204,21,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(250,204,21,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: { fontSize: 13, fontWeight: "900", color: "#facc15" },
});
