import { type ReactNode, useCallback } from "react";
import { Pressable, StyleSheet, View, Text, useColorScheme } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SPRING_SNAPPY } from "../../utils/animations";
import { tapHaptic } from "../../utils/haptics";
import { useTheme } from "../../hooks/useTheme";

type ButtonVariant = "default" | "green" | "orange" | "blue" | "red" | "gold";
/** "duo" = flat 3D Duolingo-style (solid + bottom border shadow) */
type ButtonStyle = "legacy" | "duo";
type ButtonSize = "sm" | "md" | "lg";

interface SupercellButtonProps {
  label: string;
  variant?: ButtonVariant;
  /** "legacy" = gradient Clash Royale style (for quizzes). "duo" = flat 3D Duolingo style. Default: "duo" */
  buttonStyle?: ButtonStyle;
  onPress?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  size?: ButtonSize;
}

// ── Legacy (Clash Royale) config ──────────────────────────────────────────────

const LEGACY_COLORS: Record<
  ButtonVariant,
  { gradient: [string, string]; border: string; highlight: string }
> = {
  default: {
    gradient: ["#e5e7eb", "#d1d5db"],
    border: "#64748b",
    highlight: "rgba(229, 231, 235, 0.5)",
  },
  green: {
    gradient: ["#4ade80", "#16a34a"],
    border: "#0f5e23",
    highlight: "rgba(134, 239, 172, 0.5)",
  },
  orange: {
    gradient: ["#fbbf24", "#ea580c"],
    border: "#92400e",
    highlight: "rgba(253, 224, 71, 0.5)",
  },
  blue: {
    gradient: ["#60a5fa", "#2563eb"],
    border: "#1e3a8a",
    highlight: "rgba(147, 197, 253, 0.5)",
  },
  red: {
    gradient: ["#f87171", "#ef4444"],
    border: "#991b1b",
    highlight: "rgba(248, 113, 113, 0.5)",
  },
  gold: {
    gradient: ["#f5c842", "#d4a017"],
    border: "#92400e",
    highlight: "rgba(253, 224, 71, 0.5)",
  },
};

// ── Duo (Duolingo 3D) config ──────────────────────────────────────────────────

const DUO_COLORS: Record<
  Exclude<ButtonVariant, "default">,
  { bg: string; shadow: string; text: string }
> = {
  green:  { bg: "#58cc02", shadow: "#46a302", text: "#ffffff" },
  orange: { bg: "#ff9600", shadow: "#cc7800", text: "#ffffff" },
  blue:   { bg: "#1cb0f6", shadow: "#0a8fc4", text: "#ffffff" },
  red:    { bg: "#ff4b4b", shadow: "#cc3c3c", text: "#ffffff" },
  gold:   { bg: "#f5c842", shadow: "#c8a000", text: "#ffffff" },
};

const SIZE_CONFIG: Record<ButtonSize, { minHeight: number; fontSize: number; paddingH: number }> = {
  sm: { minHeight: 44, fontSize: 15, paddingH: 16 },
  md: { minHeight: 52, fontSize: 17, paddingH: 24 },
  lg: { minHeight: 60, fontSize: 19, paddingH: 32 },
};

export function SupercellButton({
  label,
  variant = "green",
  buttonStyle = "duo",
  onPress,
  disabled = false,
  icon,
  size = "md",
}: SupercellButtonProps) {
  const theme = useTheme();
  const isDark = useColorScheme() === "dark";
  const reduceMotion = useReducedMotion();
  const pressDepth = useSharedValue(0);
  const sizeConfig = SIZE_CONFIG[size];

  const handlePressIn = useCallback(() => {
    if (disabled || reduceMotion) return;
    pressDepth.value = withSpring(1, SPRING_SNAPPY);
  }, [disabled, reduceMotion, pressDepth]);

  const handlePressOut = useCallback(() => {
    if (disabled || reduceMotion) return;
    pressDepth.value = withSpring(0, SPRING_SNAPPY);
  }, [disabled, reduceMotion, pressDepth]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    tapHaptic();
    onPress?.();
  }, [disabled, onPress]);

  // Duo 3D press: translate down + shrink shadow
  const duoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pressDepth.value * 3 }],
  }));

  // Legacy scale animation
  const legacyAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressDepth.value * 0.05 }],
  }));

  if (buttonStyle === "duo") {
    const colors = variant === "default"
      ? { bg: theme.border, shadow: isDark ? "#262626" : "#cbcfd5", text: theme.text }
      : DUO_COLORS[variant];
    return (
      <Animated.View style={[duoAnimStyle, disabled && styles.disabled]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          style={[
            styles.duoOuter,
            {
              backgroundColor: colors.shadow,
              borderRadius: size === "sm" ? 16 : size === "md" ? 24 : 32,
              minHeight: sizeConfig.minHeight,
            },
          ]}
        >
          <View
            style={[
              styles.duoInner,
              {
                backgroundColor: colors.bg,
                borderRadius: size === "sm" ? 14 : size === "md" ? 22 : 30,
                minHeight: sizeConfig.minHeight - 4,
                paddingHorizontal: sizeConfig.paddingH,
              },
            ]}
          >
            {icon && <View style={styles.iconWrapper}>{icon}</View>}
            <Text style={[styles.duoLabel, { fontSize: sizeConfig.fontSize, color: colors.text }]}>
              {label}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  // Legacy Clash Royale gradient style
  const legacyColors = LEGACY_COLORS[variant];
  return (
    <Animated.View style={[legacyAnimStyle, disabled && styles.disabled]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <View
          style={[
            styles.outerBorder,
            {
              borderColor: legacyColors.border,
              borderRadius: size === "sm" ? 12 : size === "md" ? 16 : 24,
              minHeight: sizeConfig.minHeight,
            },
          ]}
        >
          <LinearGradient
            colors={legacyColors.gradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.gradient, { borderRadius: size === "sm" ? 9 : size === "md" ? 13 : 21 }]}
          >
            <View style={[styles.topHighlight, { backgroundColor: legacyColors.highlight }]} />
            <View style={[styles.content, { paddingHorizontal: sizeConfig.paddingH }]}>
              {icon && <View style={styles.iconWrapper}>{icon}</View>}
              <Text style={[styles.legacyLabel, { fontSize: sizeConfig.fontSize }]}>{label}</Text>
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // ── Duo styles ──
  duoOuter: {
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  duoInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 0,
  },
  duoLabel: {
    fontWeight: "800",
    textAlign: "center",
  },
  // ── Legacy styles ──
  outerBorder: {
    borderWidth: 3,
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  topHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  legacyLabel: {
    fontWeight: "900",
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  iconWrapper: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});
