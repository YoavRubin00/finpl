import { Pressable, Text, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { tapHaptic } from "../../utils/haptics";

interface BackButtonProps {
  label?: string;
  color?: string;
  size?: number;
  onPress?: () => void;
  /** Screen-reader label. Defaults to the visible label, or "חזרה". */
  accessibilityLabel?: string;
}

/**
 * Unified back button for all inner screens.
 * Uses ChevronRight (RTL: means "go back") with optional label.
 *
 * The touchable box itself is 44x44 minimum (PRD-ACCESSIBILITY R5), it no
 * longer relies on hitSlop alone, which neighbours in a tight header can eat.
 * Prefer <ScreenHeader>, which places this for you.
 */
export function BackButton({ label = "", color = "#6b7280", size = 20, onPress, accessibilityLabel }: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    tapHaptic();
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      // Yoav 18.9.26 — cold open lands on the learn map: the tabs layout's
      // initialRouteName is "index" again, so bare /(tabs) is the learn map.
      router.replace('/(tabs)' as never);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (label || "חזרה")}
    >
      <ChevronRight size={size} color={color} strokeWidth={2.8} />
      {label ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});
