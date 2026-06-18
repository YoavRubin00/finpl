import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { ENERGY } from "./energyTheme";

/**
 * Subtle "-N ⚡" toast for USAGE-COST energy losses (chat message, analyst
 * lookup) — a transaction, not a punishment, so NO screen flash / shark shatter
 * (unlike EnergyLossOverlay). Floats up near top-center and fades. Also serves
 * as the reduced-motion fallback for ALL losses (pass reduceMotion to skip the
 * rise and just fade).
 */
export function EnergyMinusToast({
  amount,
  onComplete,
  reduceMotion = false,
}: {
  amount: number;
  onComplete: () => void;
  reduceMotion?: boolean;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(
        reduceMotion ? 850 : 520,
        withTiming(0, { duration: 340 }, (finished) => {
          if (finished) runOnJS(onComplete)();
        }),
      ),
    );
    if (!reduceMotion) {
      translateY.value = withTiming(-34, { duration: 1000, easing: Easing.out(Easing.cubic) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={[styles.pill, animStyle]}>
        <Text style={styles.text} allowFontScaling={false}>{`-${amount} ⚡`}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9998,
  },
  pill: {
    backgroundColor: "rgba(124,58,237,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  text: {
    color: ENERGY.deep,
    fontSize: 16,
    fontWeight: "900",
  },
});
