import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  cancelAnimation,
} from "react-native-reanimated";
import { LottieIcon } from "../../components/ui/LottieIcon";
import { STITCH } from "../../constants/theme";
import { tapHaptic } from "../../utils/haptics";

const LOTTIE_TROPHY = require("../../../assets/lottie/wired-flat-3263-trophy-circle-hover-roll.json") as number;
const SIZE = 44;

interface DailyQuestWidgetProps {
  completedCount: number;
  totalQuests: number;
  onPress: () => void;
}

export function DailyQuestWidget({ completedCount, totalQuests, onPress }: DailyQuestWidgetProps) {
  const allDone = completedCount >= totalQuests;

  // Pulsing glow when incomplete
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (allDone) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1, true,
    );
    return () => cancelAnimation(pulse);
  }, [allDone, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: pulse.value * 0.4,
    borderColor: allDone
      ? `rgba(250,204,21,${pulse.value})`
      : `rgba(0,91,177,${pulse.value * 0.6})`,
  }));

  return (
    <Animated.View entering={FadeIn.delay(400).duration(350)}>
      <Pressable
        onPress={() => { tapHaptic(); onPress(); }}
        accessibilityRole="button"
        accessibilityLabel={`משימות יומיות, ${completedCount} מתוך ${totalQuests} הושלמו`}
      >
        <Animated.View style={[styles.badge, glowStyle]}>
          <LottieIcon source={LOTTIE_TROPHY} size={26} autoPlay={allDone} loop={false} />
          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: totalQuests }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < completedCount && styles.dotDone,
                ]}
              />
            ))}
          </View>
        </Animated.View>
        <Text style={styles.counter}>{completedCount}/{totalQuests}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: STITCH.surfaceLowest,
    borderWidth: 1.5,
    borderColor: STITCH.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: STITCH.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 4,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 3,
    position: "absolute",
    bottom: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: STITCH.outlineVariant,
  },
  dotDone: {
    backgroundColor: STITCH.primary,
  },
  counter: {
    fontSize: 10,
    fontWeight: "800",
    color: STITCH.onSurfaceVariant,
    textAlign: "center",
    marginTop: 2,
  },
});
