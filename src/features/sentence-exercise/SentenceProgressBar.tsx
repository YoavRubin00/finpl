import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

interface SentenceProgressBarProps {
  current: number;
  total: number;
  onFire: boolean;
  accentColor: string;
  glowColor: string;
}

export function SentenceProgressBar({
  current,
  total,
  onFire,
  accentColor,
  glowColor,
}: SentenceProgressBarProps) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const reducedMotion = useReducedMotion();

  const widthPct = useSharedValue(pct);

  useEffect(() => {
    widthPct.value = reducedMotion
      ? pct
      : withSpring(pct, { damping: 18, stiffness: 120 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }));

  const fireColors: [string, string, string] = ["#fbbf24", "#f97316", "#ef4444"];
  const normalColors: [string, string, string] = [glowColor, glowColor, accentColor];
  const colors = onFire ? fireColors : normalColors;
  const shadow = onFire ? "#f97316" : glowColor;
  const height = onFire ? 16 : 14;

  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current }}
      accessibilityLabel={`התקדמות: ${current} מתוך ${total} תרגילים`}
    >
      {/* Step dots */}
      <View style={styles.dotsRow} pointerEvents="none">
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < current
                ? { backgroundColor: onFire ? "#f97316" : accentColor }
                : { backgroundColor: "#d1d5db" },
            ]}
          />
        ))}
      </View>

      {/* Bar track */}
      <View
        style={[
          styles.track,
          {
            height,
            borderColor: onFire ? "#ef4444" : "#d1d5db",
            borderWidth: onFire ? 2 : 1.5,
            shadowColor: shadow,
            shadowOpacity: onFire ? 0.9 : 0.4,
            shadowRadius: onFire ? 24 : 8,
            elevation: onFire ? 10 : 3,
          },
        ]}
      >
        <Animated.View style={[styles.fill, fillStyle]}>
          <LinearGradient
            colors={colors}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          >
            {/* Gloss shine */}
            <View
              style={[
                styles.gloss,
                { height: onFire ? 4 : 3 },
              ]}
            />
          </LinearGradient>
        </Animated.View>
      </View>

      {/* XP earned so far */}
      {current > 1 && (
        <Text style={[styles.xpHint, { color: onFire ? "#f97316" : accentColor }]}>
          {onFire ? "🔥 סטריק!" : `${current - 1}/${total - 1} ✓`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    gap: 6,
  },
  dotsRow: {
    flexDirection: "row-reverse",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  track: {
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
    minWidth: 8,
  },
  gloss: {
    position: "absolute",
    top: 2,
    left: 6,
    right: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 999,
  },
  xpHint: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
    writingDirection: "rtl",
  },
});