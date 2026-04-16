import { useEffect, useMemo } from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Pre-load the Lottie resources
const LOTTIE_COIN = require("../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json");
const LOTTIE_XP = require("../../../assets/lottie/wired-flat-2431-number-5-hover-pinch.json");
const LOTTIE_GEM = require("../../../assets/lottie/Diamond.json");

const PARTICLE_COUNT = 6;
const DURATION = 850;
const STAGGER = 60;

// Quadratic bezier helper
function bezier(t: number, p0: number, p1: number, p2: number): number {
  "worklet";
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

interface FlyingRewardsProps {
  type: "coins" | "xp" | "gems";
  amount: number;
  direction?: "up" | "down";
  onComplete: () => void;
}

interface ParticleConfig {
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  endX: number;
  endY: number;
  delay: number;
}

function FlyingParticle({
  config,
  type,
  amount,
  index,
  onDone,
}: {
  config: ParticleConfig;
  type: "coins" | "xp" | "gems";
  amount: number;
  index: number;
  onDone: () => void;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withTiming(1, {
        duration: DURATION,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }, (finished) => {
        if (finished && index === PARTICLE_COUNT - 1) {
          runOnJS(onDone)();
        }
      }),
    );
  }, [config.delay, index, onDone, progress]);

  const animStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const x = bezier(t, config.startX, config.controlX, config.endX);
    const y = bezier(t, config.startY, config.controlY, config.endY);
    const scale = 1 - t * 0.3; // Less shrinking
    const opacity = t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;

    return {
      position: "absolute",
      left: x - 20, // Center offset
      top: y - 20,
      transform: [{ scale }],
      opacity,
      zIndex: 999 - index,
    };
  });

  const source = type === "coins" ? LOTTIE_COIN : type === "gems" ? LOTTIE_GEM : LOTTIE_XP;

  return (
    <Animated.View style={animStyle} pointerEvents="none">
      <LottieView
        source={source}
        autoPlay
        loop
        speed={1.2}
        style={{ width: type === "coins" ? 38 : 45, height: type === "coins" ? 38 : 45 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

export function FlyingRewards({ type, amount, direction = "up", onComplete }: FlyingRewardsProps) {
  const particles = useMemo<ParticleConfig[]>(() => {
    const centerX = SCREEN_W / 2;
    // Determine target X based on type
    let targetX = centerX;
    if (type === "coins") targetX = SCREEN_W * 0.25;      // Left-aligned pill (RTL)
    else if (type === "gems") targetX = SCREEN_W * 0.45;  // Center pill
    else if (type === "xp") targetX = SCREEN_W * 0.70;    // Right layer ring (RTL)

    if (direction === "down") {
      // Reverse: from header area down to center
      const fromY = 65; // Matches exact vertical center of the new header string
      const toY = SCREEN_H * 0.55;
      return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const spread = (Math.random() - 0.5) * 40;
        const startX = targetX + spread; // From target
        const endX = centerX + (Math.random() - 0.5) * 120;
        const controlX = startX + (Math.random() - 0.5) * 160;
        const controlY = toY * 0.55;
        return {
          startX,
          startY: fromY + (Math.random() - 0.5) * 20,
          controlX,
          controlY,
          endX,
          endY: toY + (Math.random() - 0.5) * 40,
          delay: i * STAGGER,
        };
      });
    }

    const startY = SCREEN_H * 0.55;
    const endY = 65; // Targets the exact vertical center of new single-row header

    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const spread = (Math.random() - 0.5) * 120;
      const startX = centerX + spread;
      const endX = targetX + (Math.random() - 0.5) * 25; // Narrow spread so they hit the exact pill
      const controlX = startX + (targetX - startX) * 0.5 + (Math.random() - 0.5) * 160;
      const controlY = startY * 0.35;

      return {
        startX,
        startY: startY + (Math.random() - 0.5) * 40,
        controlX,
        controlY,
        endX,
        endY: endY + (Math.random() - 0.5) * 20,
        delay: i * STAGGER,
      };
    });
  }, [direction, type]);

  return (
    <>
      {particles.map((config, i) => (
        <FlyingParticle
          key={i}
          config={config}
          type={type}
          amount={amount}
          index={i}
          onDone={onComplete}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({});
