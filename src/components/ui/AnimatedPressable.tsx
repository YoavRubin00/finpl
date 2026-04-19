import { type ReactNode, useCallback } from "react";
import { Pressable, type ViewStyle, type StyleProp, type AccessibilityRole, type AccessibilityState } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from "react-native-reanimated";
import { SPRING_SNAPPY } from "../../utils/animations";
import { tapHaptic } from "../../utils/haptics";

const AnimatedPressable_ = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
  /** Disable the scale animation. */
  noScale?: boolean;
  /** Disable haptic feedback. */
  noHaptic?: boolean;
  /** Accessibility, תקן נגישות ישראלי SI 5568 */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  testID?: string;
}

export function AnimatedPressable({
  onPress,
  style,
  className,
  children,
  disabled,
  hitSlop,
  noScale,
  noHaptic,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  accessibilityState,
  testID,
}: AnimatedPressableProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!noScale && !reduceMotion) {
      scale.value = withSpring(0.95, SPRING_SNAPPY);
    }
    if (!noHaptic) {
      tapHaptic();
    }
  }, [noScale, noHaptic, scale]);

  const handlePressOut = useCallback(() => {
    if (!noScale && !reduceMotion) {
      scale.value = withSpring(1, { damping: 8, stiffness: 200 });
    }
  }, [noScale, reduceMotion, scale]);

  return (
    <AnimatedPressable_
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop}
      style={[animatedStyle, style]}
      className={className}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState ?? (disabled ? { disabled: true } : undefined)}
      testID={testID}
    >
      {children}
    </AnimatedPressable_>
  );
}
