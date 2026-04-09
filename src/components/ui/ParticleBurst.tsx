import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

export type ParticleColor = "violet" | "gold" | "cyan";

interface ParticleBurstProps {
  color: ParticleColor;
  particleCount?: number;
  onComplete: () => void;
}

const COLOR_MAP: Record<ParticleColor, string[]> = {
  violet: ["#a78bfa", "#7c3aed", "#c4b5fd", "#8b5cf6"],
  gold: ["#facc15", "#fbbf24", "#fde68a", "#f59e0b"],
  cyan: ["#06b6d4", "#0891b2", "#67e8f9", "#22d3ee"],
};

interface ParticleConfig {
  angle: number;
  distance: number;
  size: number;
  colorIndex: number;
  delay: number;
}

function generateParticles(count: number): ParticleConfig[] {
  const particles: ParticleConfig[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    particles.push({
      angle,
      distance: 40 + Math.random() * 50,
      size: 4 + Math.random() * 6,
      colorIndex: i % 4,
      delay: Math.random() * 100,
    });
  }
  return particles;
}

function Particle({
  config,
  colors,
  onComplete,
  isLast,
}: {
  config: ParticleConfig;
  colors: string[];
  onComplete: () => void;
  isLast: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 600 + config.delay,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished && isLast) {
        // Only the last particle triggers completion
      }
    });
    // Fire onComplete after max duration
    if (isLast) {
      const timer = setTimeout(onComplete, 750);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const x = Math.cos(config.angle) * config.distance * p;
    const y = Math.sin(config.angle) * config.distance * p;
    return {
      opacity: 1 - p,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: 1 - p * 0.5 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: colors[config.colorIndex],
        },
        animatedStyle,
      ]}
    />
  );
}

export function ParticleBurst({
  color,
  particleCount = 12,
  onComplete,
}: ParticleBurstProps) {
  const particles = useMemo(
    () => generateParticles(particleCount),
    [particleCount],
  );
  const colors = COLOR_MAP[color];

  return (
    <View style={styles.container}>
      {particles.map((config, index) => (
        <Particle
          key={index}
          config={config}
          colors={colors}
          onComplete={onComplete}
          isLast={index === particles.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    top: 60,
    alignItems: "center",
    justifyContent: "center",
  },
});
