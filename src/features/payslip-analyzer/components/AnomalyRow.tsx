import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { ChevronDown, Info, AlertTriangle, OctagonAlert } from "lucide-react-native";
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { AnimatedPressable } from "../../../components/ui/AnimatedPressable";
import type { PayslipAnomaly, PayslipAnomalySeverity } from "../types";

const RTL = { writingDirection: "rtl" as const, textAlign: "right" as const };

interface SeverityTheme {
  bg: string;
  accent: string;
  title: string;
  body: string;
}

const SEVERITY_THEME: Record<PayslipAnomalySeverity, SeverityTheme> = {
  info: {
    bg: "#ecfdf5",
    accent: "#16a34a",
    title: "#064e3b",
    body: "#065f46",
  },
  warn: {
    bg: "#fffbeb",
    accent: "#d97706",
    title: "#7c2d12",
    body: "#78350f",
  },
  critical: {
    bg: "#fef2f2",
    accent: "#dc2626",
    title: "#7f1d1d",
    body: "#991b1b",
  },
};

function SeverityIcon({ severity }: { severity: PayslipAnomalySeverity }) {
  const color = SEVERITY_THEME[severity].accent;
  if (severity === "critical") {
    return <OctagonAlert size={18} color={color} strokeWidth={2.5} />;
  }
  if (severity === "warn") {
    return <AlertTriangle size={18} color={color} strokeWidth={2.5} />;
  }
  return <Info size={18} color={color} strokeWidth={2.5} />;
}

interface AnomalyRowProps {
  anomaly: PayslipAnomaly;
  index?: number;
}

export function AnomalyRow({ anomaly, index = 0 }: AnomalyRowProps) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const theme = SEVERITY_THEME[anomaly.severity];

  const pulse = useSharedValue(0);
  const chevron = useSharedValue(0);

  useEffect(() => {
    if (anomaly.severity !== "critical") return;
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse, anomaly.severity, reduceMotion]);

  useEffect(() => {
    chevron.value = withTiming(expanded ? 1 : 0, { duration: 220 });
  }, [chevron, expanded]);

  const cardStyle = useAnimatedStyle(() => {
    if (anomaly.severity !== "critical") {
      return { borderColor: theme.accent };
    }
    const opacity = 0.45 + pulse.value * 0.55;
    return {
      borderColor: theme.accent,
      shadowOpacity: 0.15 + pulse.value * 0.25,
      opacity,
    };
  });

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 90).duration(280)}
      style={[styles.row, { backgroundColor: theme.bg }, cardStyle]}
    >
      <View style={[styles.accent, { backgroundColor: theme.accent }]} />
      <AnimatedPressable
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityLabel={anomaly.title}
        accessibilityHint={expanded ? "סגור פרטים" : "פתח פרטים"}
        accessibilityState={{ expanded }}
        style={styles.pressArea}
        noScale
        noHaptic
      >
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <SeverityIcon severity={anomaly.severity} />
          </View>
          <View style={styles.titleWrap}>
            <Text
              style={[styles.title, { color: theme.title }, RTL]}
              allowFontScaling={false}
              numberOfLines={2}
            >
              {anomaly.title}
            </Text>
          </View>
          <Animated.View style={[styles.chevronWrap, chevronStyle]}>
            <ChevronDown size={18} color={theme.title} strokeWidth={2.5} />
          </Animated.View>
        </View>

        {expanded ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.detail}>
            <Text
              style={[styles.body, { color: theme.body }, RTL]}
              allowFontScaling={false}
            >
              {anomaly.description}
            </Text>
            {anomaly.suggestion ? (
              <View style={styles.suggestionBox}>
                <Text
                  style={[styles.suggestionLabel, RTL]}
                  allowFontScaling={false}
                >
                  הצעה
                </Text>
                <Text
                  style={[styles.suggestion, { color: theme.body }, RTL]}
                  allowFontScaling={false}
                >
                  {anomaly.suggestion}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  accent: {
    width: 4,
  },
  pressArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
  },
  chevronWrap: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  detail: {
    marginTop: 4,
    gap: 8,
  },
  body: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  suggestionBox: {
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0c4a6e",
    letterSpacing: 0.4,
  },
  suggestion: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
});
