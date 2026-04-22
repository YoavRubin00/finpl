/**
 * NetworkStatusBanner, shows a persistent banner when the device is offline.
 * Uses the existing NotificationBanner animation pattern but with a red/warning theme.
 */
import { useEffect } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { WifiOff } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

const OFFLINE_RED = "#ef4444";

export function NetworkStatusBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOffline = !isConnected || !isInternetReachable;
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-70);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isOffline) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      translateY.value = withSpring(-70, { damping: 18, stiffness: 220 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [isOffline]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
    paddingTop: insets.top + 4,
  }));

  return (
    <Animated.View
      style={[styles.banner, animatedStyle]}
      pointerEvents={isOffline ? "auto" : "none"}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel="אין חיבור לאינטרנט"
    >
      <WifiOff size={18} color="#ffffff" strokeWidth={2.5} />
      <Text style={styles.message}>אין חיבור לאינטרנט</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: OFFLINE_RED,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 12,
  },
  message: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    writingDirection: "rtl",
    textAlign: "right",
  },
});
