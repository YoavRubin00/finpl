import { Pressable, Text, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { tapHaptic } from "../../utils/haptics";

interface BackButtonProps {
  label?: string;
  color?: string;
  onPress?: () => void;
}

/**
 * Unified back button for all inner screens.
 * Uses ChevronRight (RTL: means "go back") with optional label.
 */
export function BackButton({ label = "", color = "#6b7280", onPress }: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    tapHaptic();
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as never);
    }
  };

  return (
    <Pressable onPress={handlePress} style={styles.btn} hitSlop={12} accessibilityRole="button" accessibilityLabel={label || "חזרה"}>
      <ChevronRight size={20} color={color} strokeWidth={2.5} />
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
