import { Pressable, Text, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { tapHaptic } from "../../utils/haptics";

interface BackButtonProps {
  label?: string;
  color?: string;
  size?: number;
  onPress?: () => void;
}

/**
 * Unified back button for all inner screens.
 * Uses ChevronRight (RTL: means "go back") with optional label.
 */
export function BackButton({ label = "", color = "#6b7280", size = 20, onPress }: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    tapHaptic();
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      // Always /(tabs)/index — bare /(tabs) lands on Investments (the tabs
      // layout sets initialRouteName='investments'), which is rarely what
      // the user wants when backing out of a feature screen.
      router.replace('/(tabs)/index' as never);
    }
  };

  return (
    <Pressable onPress={handlePress} style={styles.btn} hitSlop={12} accessibilityRole="button" accessibilityLabel={label || "חזרה"}>
      <ChevronRight size={size} color={color} strokeWidth={2.8} />
      {label ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});
