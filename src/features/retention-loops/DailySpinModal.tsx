import { useState, useCallback } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import Svg, { Path, G, Text as SvgText } from "react-native-svg";
import { Coins, Gift } from "lucide-react-native";
import { useRetentionStore, DAILY_SPIN_REWARDS } from "./useRetentionStore";
import { AnimatedPressable } from "../../components/ui/AnimatedPressable";
import {
  useEntranceAnimation,
  fadeInScale,
  fadeInUp,
  SPRING_BOUNCY,
} from "../../utils/animations";
import { successHaptic, heavyHaptic } from "../../utils/haptics";

interface DailySpinModalProps {
  visible: boolean;
  onDismiss: () => void;
}

type SpinPhase = "idle" | "spinning" | "result";

const SEGMENT_COUNT = DAILY_SPIN_REWARDS.length;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

const SEGMENT_COLORS = [
  "#7c3aed", // violet
  "#f97316", // orange
  "#06b6d4", // cyan
  "#facc15", // yellow
  "#ec4899", // pink
];

const WHEEL_RADIUS = 100;
const WHEEL_SIZE = WHEEL_RADIUS * 2;

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function buildSlicePath(index: number): string {
  const startAngle = index * SEGMENT_ANGLE;
  const endAngle = startAngle + SEGMENT_ANGLE;
  const cx = WHEEL_RADIUS;
  const cy = WHEEL_RADIUS;
  const r = WHEEL_RADIUS;

  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function DailySpinModal({ visible, onDismiss }: DailySpinModalProps) {
  const spinDailyWheel = useRetentionStore((s) => s.spinDailyWheel);
  const lastSpinDate = useRetentionStore((s) => s.dailySpin.lastSpinDate);

  const [phase, setPhase] = useState<SpinPhase>("idle");
  const [reward, setReward] = useState(0);

  const rotation = useSharedValue(0);
  const resultScale = useSharedValue(0);

  const alreadySpun =
    lastSpinDate === new Date().toISOString().slice(0, 10);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const resultStyle = useAnimatedStyle(() => ({
    opacity: resultScale.value,
    transform: [{ scale: resultScale.value }],
  }));

  const modalEntrance = useEntranceAnimation(fadeInScale, { delay: 100 });
  const titleEntrance = useEntranceAnimation(fadeInUp, { delay: 200 });

  const onSpinComplete = useCallback(
    (coins: number) => {
      setReward(coins);
      setPhase("result");
      successHaptic();
      resultScale.value = withSpring(1, SPRING_BOUNCY);
    },
    [resultScale],
  );

  const handleSpin = useCallback(() => {
    if (phase !== "idle" || alreadySpun) return;

    setPhase("spinning");
    heavyHaptic();

    const coins = spinDailyWheel();
    if (coins === 0) {
      setPhase("idle");
      return;
    }

    const rewardIndex = DAILY_SPIN_REWARDS.indexOf(
      coins as (typeof DAILY_SPIN_REWARDS)[number],
    );
    const targetAngle =
      -(rewardIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
    const fullSpins = 360 * 5;

    rotation.value = withTiming(
      fullSpins + targetAngle,
      { duration: 3000, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(onSpinComplete)(coins);
        }
      },
    );
  }, [phase, alreadySpun, spinDailyWheel, rotation, onSpinComplete]);

  const handleDismiss = useCallback(() => {
    setPhase("idle");
    setReward(0);
    rotation.value = 0;
    resultScale.value = 0;
    onDismiss();
  }, [onDismiss, rotation, resultScale]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/70 px-6"
        onPress={phase === "spinning" ? undefined : handleDismiss}
      >
        <Pressable
          onPress={() => {
            // Prevent tap-through
          }}
        >
          <Animated.View
            style={[modalEntrance, styles.modalCard]}
            className="w-full items-center rounded-3xl p-6"
          >
            {/* Title */}
            <Animated.View style={titleEntrance} className="mb-4 items-center">
              <View
                className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-yellow-500/20"
                style={styles.iconGlow}
              >
                <Gift size={28} color="#facc15" />
              </View>
              <Text className="mb-1 text-xl font-bold text-violet-300">
                Daily Spin
              </Text>
              <Text className="text-center text-sm text-zinc-400">
                {alreadySpun
                  ? "Come back tomorrow for another spin!"
                  : "Spin the wheel to win coins!"}
              </Text>
            </Animated.View>

            {/* Wheel */}
            <View className="mb-6 items-center justify-center">
              {/* Pointer */}
              <View style={styles.pointer} />

              <Animated.View style={[styles.wheel, wheelStyle]}>
                <Svg
                  width={WHEEL_SIZE}
                  height={WHEEL_SIZE}
                  viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
                >
                  {DAILY_SPIN_REWARDS.map((value, index) => {
                    const midAngle =
                      index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
                    const labelPos = polarToCartesian(
                      WHEEL_RADIUS,
                      WHEEL_RADIUS,
                      WHEEL_RADIUS * 0.6,
                      midAngle,
                    );
                    return (
                      <G key={value}>
                        <Path
                          d={buildSlicePath(index)}
                          fill={SEGMENT_COLORS[index]}
                          stroke="#18181b"
                          strokeWidth={2}
                        />
                        <SvgText
                          x={labelPos.x}
                          y={labelPos.y - 4}
                          fill="#ffffff"
                          fontSize={14}
                          fontWeight="700"
                          textAnchor="middle"
                          alignmentBaseline="middle"
                        >
                          {value}
                        </SvgText>
                        <SvgText
                          x={labelPos.x}
                          y={labelPos.y + 12}
                          fill="#ffffffcc"
                          fontSize={9}
                          fontWeight="600"
                          textAnchor="middle"
                          alignmentBaseline="middle"
                        >
                          coins
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
                {/* Center hub */}
                <View style={styles.wheelCenter}>
                  <Coins size={16} color="#facc15" />
                </View>
              </Animated.View>
            </View>

            {/* Result overlay */}
            {phase === "result" && (
              <Animated.View
                style={resultStyle}
                className="absolute inset-0 items-center justify-center rounded-3xl bg-zinc-900/95"
              >
                <View style={styles.rewardGlow}>
                  <Coins size={40} color="#facc15" />
                </View>
                <Text className="mt-4 text-2xl font-bold text-yellow-400">
                  +{reward} Coins!
                </Text>
                <Text className="mt-1 text-sm text-zinc-400">
                  Added to your balance
                </Text>
                <AnimatedPressable
                  onPress={handleDismiss}
                  style={styles.buttonGlow}
                  className="mt-6 rounded-xl bg-violet-600 px-8 py-3"
                >
                  <Text className="text-center text-sm font-semibold text-white">
                    Collect
                  </Text>
                </AnimatedPressable>
              </Animated.View>
            )}

            {/* Spin button */}
            {phase !== "result" && (
              <AnimatedPressable
                onPress={handleSpin}
                disabled={phase === "spinning" || alreadySpun}
                style={
                  alreadySpun || phase === "spinning"
                    ? undefined
                    : styles.buttonGlow
                }
                className={`w-full rounded-xl py-3 ${
                  alreadySpun || phase === "spinning"
                    ? "bg-zinc-700"
                    : "bg-violet-600"
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    alreadySpun || phase === "spinning"
                      ? "text-zinc-400"
                      : "text-white"
                  }`}
                >
                  {phase === "spinning"
                    ? "Spinning..."
                    : alreadySpun
                      ? "Already Spun Today"
                      : "Spin!"}
                </Text>
              </AnimatedPressable>
            )}
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalCard: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#7c3aed",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonGlow: {
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  iconGlow: {
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_RADIUS,
    overflow: "hidden" as const,
    borderWidth: 3,
    borderColor: "#7c3aed",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  wheelCenter: {
    position: "absolute" as const,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#27272a",
    borderWidth: 2,
    borderColor: "#facc15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  pointer: {
    position: "absolute" as const,
    top: -6,
    zIndex: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#facc15",
  },
  rewardGlow: {
    shadowColor: "#facc15",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
});
