import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";

const PARTICLE_COUNT = 30;
const COLORS = ["#d4a017", "#facc15", "#a78bfa", "#4ade80", "#f97316", "#38bdf8", "#ef4444", "#e879f9"];

interface Particle {
  color: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rotation: number;
  size: number;
  delay: number;
  shape: "circle" | "square" | "star";
}

function generateParticles(count: number, gentle: boolean): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    // Gentle: shorter travel + smaller particles for a soft, non-dominant
    // sprinkle (e.g. on every chip completion) vs the full chest-open burst.
    const distance = gentle ? 50 + Math.random() * 90 : 100 + Math.random() * 180;
    const shapes: Particle["shape"][] = ["circle", "square", "star"];
    return {
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      startX: 0,
      startY: 0,
      endX: Math.cos(angle) * distance,
      endY: Math.sin(angle) * distance - (gentle ? 24 : 40) - Math.random() * (gentle ? 30 : 60),
      rotation: Math.random() * 720 - 360,
      size: gentle ? 4 + Math.random() * 6 : 7 + Math.random() * 10,
      delay: Math.random() * 200,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    };
  });
}

function ConfettiParticle({ particle }: { particle: Particle }) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      particle.delay,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );
    opacity.value = withDelay(
      particle.delay + 500,
      withTiming(0, { duration: 400 }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: particle.startX + (particle.endX - particle.startX) * progress.value },
      { translateY: particle.startY + (particle.endY - particle.startY) * progress.value + progress.value * progress.value * 80 },
      { rotate: `${particle.rotation * progress.value}deg` },
      { scale: 1 - progress.value * 0.3 },
    ],
    opacity: opacity.value,
  }));

  const shapeStyle = particle.shape === "circle"
    ? { borderRadius: particle.size / 2 }
    : particle.shape === "star"
      ? { borderRadius: 2, transform: [{ rotate: "45deg" }] }
      : { borderRadius: 2 };

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          ...shapeStyle,
        },
        style,
      ]}
    />
  );
}

interface ConfettiExplosionProps {
  onComplete?: () => void;
  /** Particle count. Default 30 (full burst); lower for a subtler effect. */
  particleCount?: number;
  /** Gentler look: smaller particles + shorter travel. Default false. */
  gentle?: boolean;
}

export function ConfettiExplosion({ onComplete, particleCount = PARTICLE_COUNT, gentle = false }: ConfettiExplosionProps) {
  const reduceMotion = useReducedMotion();
  // Stable ref so changing onComplete identity never restarts the timer
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Generate particles once per mount (or when count/gentle change)
  const particles = useMemo(() => generateParticles(particleCount, gentle), [particleCount, gentle]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onCompleteRef.current?.();
    }, reduceMotion ? 0 : 1200);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle, index) => (
        <ConfettiParticle key={index} particle={particle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
});
