import React from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { phaseAtTime } from "../diamondHandsData";

interface Props {
  elapsedMs: number;
  active: boolean;
}

export function PhaseVignette({ elapsedMs, active }: Props) {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (!active) {
      opacity.value = withTiming(0, { duration: 300 });
      return;
    }
    const p = phaseAtTime(elapsedMs);
    opacity.value = withTiming(p.vignetteOpacity, { duration: 400 });
  }, [elapsedMs, active, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const currentColor = React.useMemo(() => {
    const p = phaseAtTime(elapsedMs);
    return p.vignetteColor;
  }, [elapsedMs]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, style]}
    >
      <LinearGradient
        colors={["transparent", currentColor, currentColor]}
        locations={[0, 0.7, 1]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["transparent", currentColor, currentColor]}
        locations={[0, 0.7, 1]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Animated.View>
  );
}
