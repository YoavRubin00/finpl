import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Coins, Diamond } from "lucide-react-native";
import { SPRING_BOUNCY } from "../../utils/animations";

export type RewardType = "xp" | "coins" | "gems";

interface RewardPopupProps {
  amount: number;
  type: RewardType;
  onComplete: () => void;
}

const COLORS: Record<RewardType, string> = {
  xp: "#a78bfa",
  coins: "#facc15",
  gems: "#06b6d4",
};

const LABELS: Record<RewardType, string> = {
  xp: "XP",
  coins: "",
  gems: "💎",
};

export function RewardPopup({ amount, type, onComplete }: RewardPopupProps) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1.2, SPRING_BOUNCY);
    translateY.value = withTiming(-80, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withDelay(
      700,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const color = COLORS[type];
  const label = LABELS[type];

  return (
    <Animated.View style={[styles.container, animatedStyle]} accessibilityLiveRegion="polite" accessibilityLabel={`+${amount} ${type === "xp" ? "XP" : type === "coins" ? "מטבעות" : "ג'מס"}`}>
      {type === "coins" && (
        <Coins size={18} color={color} style={styles.icon} />
      )}
      {type === "gems" && (
        <Diamond size={18} color={color} style={styles.icon} />
      )}
      <Animated.Text style={[styles.text, { color }]}>
        +{amount} {label}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    top: 60,
  },
  text: {
    fontSize: 22,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  icon: {
    marginRight: 4,
  },
});
