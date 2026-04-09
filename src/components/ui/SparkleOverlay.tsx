import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";

type Density = "low" | "medium" | "high";

interface SparkleOverlayProps {
  color?: string;
  density?: Density;
  active?: boolean;
}

const DENSITY_COUNT: Record<Density, number> = {
  low: 6,
  medium: 9,
  high: 12,
};

interface SparkleConfig {
  x: number; // percentage 0-100
  size: number; // 2-4px
  delay: number; // ms
  duration: number; // ms
  travel: number; // px to travel upward
}

function generateSparkles(count: number): SparkleConfig[] {
  const sparkles: SparkleConfig[] = [];
  for (let i = 0; i < count; i++) {
    sparkles.push({
      x: (i / count) * 100 + Math.random() * (100 / count) * 0.8,
      size: 2 + Math.random() * 2,
      delay: Math.random() * 3000,
      duration: 3000 + Math.random() * 2000,
      travel: 50 + Math.random() * 50,
    });
  }
  return sparkles;
}

function Sparkle({
  config,
  color,
  active,
}: {
  config: SparkleConfig;
  color: string;
  active: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: config.duration,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    // Opacity: fade in 0→0.6 in first 30%, hold, fade out 0.6→0 in last 30%
    let opacity: number;
    if (p < 0.3) {
      opacity = (p / 0.3) * 0.6;
    } else if (p < 0.7) {
      opacity = 0.6;
    } else {
      opacity = ((1 - p) / 0.3) * 0.6;
    }

    return {
      opacity,
      transform: [{ translateY: -p * config.travel }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: `${config.x}%`,
          bottom: 20,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function SparkleOverlay({
  color = "#f5c842",
  density = "medium",
  active = true,
}: SparkleOverlayProps) {
  const count = DENSITY_COUNT[density];
  const sparkles = useMemo(() => generateSparkles(count), [count]);

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {sparkles.map((config, i) => (
        <Sparkle key={i} config={config} color={color} active={active} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
