import React, { useEffect } from "react";
import { View, Text, Pressable, Dimensions, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
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
import { Sparkles, FileText } from "lucide-react-native";
import { FINN_HAPPY, FINN_TABLET } from "../retention-loops/finnMascotConfig";
import { tapHaptic } from "../../utils/haptics";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = 20;
const CONTENT_W = SCREEN_W - H_PAD * 2;
const CENTER_X = CONTENT_W / 2;

const NODE_SIZE = 64;
const ROW_HEIGHT = NODE_SIZE + 40;
const SHARK_SIZE = 44;

interface PayslipPathNodeProps {
  /** Horizontal offset from center, sign opposite of the main path zigzag at mod-1-5. */
  offsetX: number;
  /** True when mod-1-5 was completed by the user — switches to the celebratory state. */
  unlocked: boolean;
}

function PayslipPathNodeInner({ offsetX, unlocked }: PayslipPathNodeProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  // Gentle blue pulse when locked-but-discoverable, brighter gold pulse when unlocked.
  const pulse = useSharedValue(reducedMotion ? 0.9 : 0);
  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(pulse);
      pulse.value = 0.9;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: unlocked ? 600 : 1100 }),
        withTiming(0.25, { duration: unlocked ? 600 : 1100 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [unlocked, pulse, reducedMotion]);

  const glowStyle = useAnimatedStyle(() => {
    const rgb = unlocked ? "250,204,21" : "59,130,246";
    return {
      shadowOpacity: pulse.value * (unlocked ? 0.55 : 0.32),
      borderColor: `rgba(${rgb}, ${0.45 + pulse.value * 0.45})`,
    };
  });

  const palette = unlocked
    ? { bg: "#fef3c7", border: "#f59e0b", text: "#92400e", glow: "#facc15" }
    : { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af", glow: "#60a5fa" };

  const labelHe = unlocked ? "תנסה עליי!" : "נתח תלוש";

  return (
    <View style={[styles.row, { height: ROW_HEIGHT }]}>
      <Animated.View
        entering={FadeInDown.delay(140).duration(360)}
        style={[styles.col, { left: CENTER_X - NODE_SIZE / 2 + offsetX }]}
      >
        <Pressable
          onPress={() => {
            tapHaptic();
            router.push("/payslip-analyzer" as never);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${labelHe}. נתח תלוש שכר אמיתי עם קפטן שארק.`}
          accessibilityHint="פותח את מסך ניתוח התלוש"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Animated.View
            style={[
              styles.depth,
              { backgroundColor: palette.border },
            ]}
          />
          <Animated.View
            style={[
              styles.circle,
              {
                backgroundColor: palette.bg,
                borderColor: palette.border,
                shadowColor: palette.glow,
              },
              glowStyle,
            ]}
          >
            <FileText size={26} color={palette.text} strokeWidth={2.4} />
            {unlocked && (
              <View style={styles.sparkleBadge}>
                <Sparkles size={11} color="#92400e" strokeWidth={2.6} />
              </View>
            )}
          </Animated.View>
          <View style={[styles.labelWrap, { borderColor: palette.border }]}>
            <Text style={[styles.labelText, { color: palette.text }]} numberOfLines={1}>
              {labelHe}
            </Text>
          </View>
        </Pressable>
      </Animated.View>

      {/* Shark peek + speech, only after mod-1-5 unlocks the analyzer */}
      {unlocked && (
        <Animated.View
          entering={FadeInRight.delay(320).duration(420)}
          style={[
            styles.sharkPeek,
            offsetX >= 0
              ? { left: CENTER_X - NODE_SIZE / 2 + offsetX - SHARK_SIZE - 6 }
              : { left: CENTER_X + NODE_SIZE / 2 + offsetX + 6 },
          ]}
          pointerEvents="none"
        >
          <ExpoImage
            source={unlocked ? FINN_HAPPY : FINN_TABLET}
            style={styles.sharkImg}
            contentFit="contain"
            accessible={false}
          />
          <View style={styles.sharkBubble}>
            <Text style={styles.sharkBubbleText} numberOfLines={1}>תנסה עליי!</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

export const PayslipPathNode = React.memo(PayslipPathNodeInner);

const styles = StyleSheet.create({
  row: {
    position: "relative",
    width: CONTENT_W,
  },
  col: {
    position: "absolute",
    top: 6,
    alignItems: "center",
    width: NODE_SIZE,
  },
  depth: {
    position: "absolute",
    top: 4,
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
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  sparkleBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#facc15",
    borderWidth: 1.5,
    borderColor: "#92400e",
    alignItems: "center",
    justifyContent: "center",
  },
  labelWrap: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    writingDirection: "rtl",
  },
  sharkPeek: {
    position: "absolute",
    top: 10,
    alignItems: "center",
    width: SHARK_SIZE,
  },
  sharkImg: {
    width: SHARK_SIZE,
    height: SHARK_SIZE,
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
    writingDirection: "rtl",
  },
});