import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  Easing,
} from "react-native-reanimated";

const RTL_CENTER = {
  writingDirection: "rtl" as const,
  textAlign: "center" as const,
};

const ROWS: ReadonlyArray<{ heightTitle: number; heightBody: number }> = [
  { heightTitle: 16, heightBody: 38 },
  { heightTitle: 16, heightBody: 64 },
  { heightTitle: 16, heightBody: 50 },
  { heightTitle: 16, heightBody: 44 },
];

interface SkeletonRowProps {
  index: number;
  heightTitle: number;
  heightBody: number;
  reduceMotion: boolean;
}

function SkeletonRow({
  index,
  heightTitle,
  heightBody,
  reduceMotion,
}: SkeletonRowProps) {
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 0.6;
      return;
    }
    pulse.value = withDelay(
      index * 180,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 720, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.45, { duration: 720, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse, index, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.delay(index * 120).duration(260)}
      style={styles.card}
    >
      <Animated.View
        style={[
          styles.titleBar,
          { height: heightTitle, width: "42%" },
          animatedStyle,
        ]}
      />
      <Animated.View
        style={[styles.bodyBar, { height: heightBody }, animatedStyle]}
      />
    </Animated.View>
  );
}

export function AnalyzingState() {
  const reduceMotion = useReducedMotion();

  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text
        style={[styles.heading, RTL_CENTER]}
        accessibilityLabel="מנתח את התלוש"
        allowFontScaling={false}
      >
        מנתח את התלוש…
      </Text>
      <Text style={[styles.sub, RTL_CENTER]} allowFontScaling={false}>
        הצללית קוראת את המספרים, רגע…
      </Text>

      <View style={styles.list}>
        {ROWS.map((row, i) => (
          <SkeletonRow
            key={i}
            index={i}
            heightTitle={row.heightTitle}
            heightBody={row.heightBody}
            reduceMotion={reduceMotion}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  heading: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0c4a6e",
  },
  sub: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginTop: -4,
    marginBottom: 4,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.18)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  titleBar: {
    backgroundColor: "#c7d8e8",
    borderRadius: 6,
  },
  bodyBar: {
    backgroundColor: "#e2eaf3",
    borderRadius: 8,
    width: "100%",
  },
});
