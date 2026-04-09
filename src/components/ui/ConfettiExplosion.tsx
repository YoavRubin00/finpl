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

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.8;
    const distance = 100 + Math.random() * 180;
    const shapes: Particle["shape"][] = ["circle", "square", "star"];
    return {
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      startX: 0,
      startY: 0,
      endX: Math.cos(angle) * distance,
      endY: Math.sin(angle) * distance - 40 - Math.random() * 60,
      rotation: Math.random() * 720 - 360,
      size: 7 + Math.random() * 10,
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
}

export function ConfettiExplosion({ onComplete }: ConfettiExplosionProps) {
  const reduceMotion = useReducedMotion();
  // Stable ref so changing onComplete identity never restarts the timer
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Generate particles once per mount
  const particles = useMemo(() => generateParticles(), []);

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
