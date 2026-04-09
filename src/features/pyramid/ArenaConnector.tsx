import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";

interface ArenaConnectorProps {
  isActive: boolean;
  glowColor: string;
}

export function ArenaConnector({ isActive, glowColor }: ArenaConnectorProps) {
  const pulseY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      pulseY.value = withRepeat(
        withTiming(1, { duration: 1200 }),
        -1,
        false,
      );
    }
    return () => {
      cancelAnimation(pulseY);
    };
  }, [isActive, pulseY]);

  const pulseStyle = useAnimatedStyle(() => ({
    top: pulseY.value * 28,
    opacity: isActive ? 1 - pulseY.value * 0.5 : 0,
  }));

  return (
    <View className="items-center my-1" style={styles.container}>
      {/* Main line */}
      <View
        style={[
          styles.line,
          {
            backgroundColor: isActive ? glowColor : "#e5e7eb",
          },
        ]}
      />

      {/* Energy pulse dot */}
      {isActive && (
        <Animated.View
          style={[
            styles.pulse,
            { backgroundColor: glowColor, shadowColor: glowColor },
            pulseStyle,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 36,
    position: "relative",
  },
  line: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  pulse: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});
