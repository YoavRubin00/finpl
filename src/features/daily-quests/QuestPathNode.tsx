import React, { useEffect } from "react";
import { View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
  FadeInRight,
  cancelAnimation,
  useReducedMotion,
} from "react-native-reanimated";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { tapHaptic } from "../../utils/haptics";

const LOTTIE_TROPHY = require("../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json") as number;
const LOTTIE_CHEST = require("../../../assets/lottie/3D Treasure Box.json") as number;

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = 20;
const CONTENT_W = SCREEN_W - H_PAD * 2;
const CENTER_X = CONTENT_W / 2;

const NODE_SIZE = 72;
const ROW_HEIGHT = NODE_SIZE + 44;

type QuestState = "pending" | "ready" | "claimed";

interface QuestPathNodeProps {
  offsetX: number;
  completedCount: number;
  totalQuests: number;
  allCompleted: boolean;
  rewardClaimed: boolean;
  onPress: () => void;
}

function QuestPathNodeInner({
  offsetX,
  completedCount,
  totalQuests,
  allCompleted,
  rewardClaimed,
  onPress,
}: QuestPathNodeProps) {
  const state: QuestState = rewardClaimed ? "claimed" : allCompleted ? "ready" : "pending";
  const reducedMotion = useReducedMotion();

  // Pulse glow — stronger when ready-to-claim (golden), softer when pending (blue).
  // Skipped entirely when reduced motion is on.
  const pulse = useSharedValue(reducedMotion ? 0.9 : 0);
  useEffect(() => {
    if (state === "claimed" || reducedMotion) {
      cancelAnimation(pulse);
      pulse.value = state === "claimed" ? 0 : 0.9;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: state === "ready" ? 600 : 900 }),
        withTiming(0.25, { duration: state === "ready" ? 600 : 900 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [state, pulse, reducedMotion]);

  const glowStyle = useAnimatedStyle(() => {
    const rgb = state === "ready" ? "250,204,21" : "37,99,235";
    return {
      shadowOpacity: pulse.value * (state === "ready" ? 0.55 : 0.35),
      borderColor: `rgba(${rgb}, ${0.45 + pulse.value * 0.45})`,
    };
  });

  const palette = state === "claimed"
    ? { bg: "#e2e8f0", border: "#cbd5e1", text: "#94a3b8", glow: "#94a3b8" }
    : state === "ready"
      ? { bg: "#fef3c7", border: "#f59e0b", text: "#92400e", glow: "#facc15" }
      : { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af", glow: "#60a5fa" };

  const labelHe = state === "claimed"
    ? "הפרס נאסף"
    : state === "ready"
      ? "פתחו את התיבה!"
      : "משימות יומיות";

  return (
    <View style={[styles.row, { height: ROW_HEIGHT }]}>
      <Animated.View
        entering={FadeInDown.delay(120).duration(350)}
        style={[styles.col, { left: CENTER_X - NODE_SIZE / 2 + offsetX }]}
      >
        <Pressable
          onPress={() => { tapHaptic(); onPress(); }}
          accessibilityRole="button"
          accessibilityLabel={`${labelHe}, ${completedCount} מתוך ${totalQuests} הושלמו`}
          accessibilityHint="פותח את גיליון המשימות היומיות"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.View
            style={[
              styles.depth,
              {
                backgroundColor: palette.border,
                opacity: state === "claimed" ? 0.55 : 1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.circle,
              {
                backgroundColor: palette.bg,
                borderColor: palette.border,
                shadowColor: palette.glow,
                opacity: state === "claimed" ? 0.75 : 1,
              },
              glowStyle,
            ]}
          >
            <LottieIcon
              source={state === "ready" ? LOTTIE_CHEST : LOTTIE_TROPHY}
              size={state === "ready" ? 52 : 40}
              autoPlay
              loop={state !== "claimed"}
            />
            <View style={styles.dotsRow}>
              {Array.from({ length: totalQuests }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i < completedCount ? palette.border : "rgba(255,255,255,0.6)" },
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        </Pressable>

      </Animated.View>

      {/* Shark peek + speech — only when ready-to-claim */}
      {state === "ready" && (
        <Animated.View
          entering={FadeInRight.delay(300).duration(400)}
          style={[
            styles.sharkPeek,
            offsetX >= 0
              ? { left: CENTER_X - NODE_SIZE / 2 + offsetX - SHARK_SIZE - 6 }
              : { left: CENTER_X + NODE_SIZE / 2 + offsetX + 6 },
          ]}
          pointerEvents="none"
        >
          <ExpoImage source={FINN_HAPPY} style={styles.sharkImg} contentFit="contain" accessible={false} />
          <View style={styles.sharkBubble}>
            <Text style={styles.sharkBubbleText} numberOfLines={1}>פתח!</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const SHARK_SIZE = 48;

export const QuestPathNode = React.memo(QuestPathNodeInner);

const styles = StyleSheet.create({
  row: {
    position: "relative",
    width: CONTENT_W,
  },
  col: {
    position: "absolute",
    top: 8,
    alignItems: "center",
    width: NODE_SIZE,
  },
  depth: {
    position: "absolute",
    top: 5,
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
  },
  circle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 6,
    overflow: "hidden",
  },
  dotsRow: {
    position: "absolute",
    bottom: 6,
    flexDirection: "row-reverse",
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  labelWrap: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  labelText: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  sharkPeek: {
    position: "absolute",
    top: 12,
    alignItems: "center",
    width: 48,
  },
  sharkImg: {
    width: 48,
    height: 48,
  },
  sharkBubble: {
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  sharkBubbleText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400e",
  },
});
