import React from "react";
import { Pressable, PressableProps } from "react-native";

interface AccessibleTouchableProps extends Omit<PressableProps, "accessibilityLabel"> {
  /** Required: screen-reader label, in Hebrew or the user's locale. */
  accessibilityLabel: string;
  children?: React.ReactNode;
}

const DEFAULT_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

/**
 * Pressable wrapper that enforces an `accessibilityLabel` at the type level
 * and applies a 44pt-friendly default hitSlop + button role for VoiceOver.
 * Use this for icon-only or small touch targets.
 */
export function AccessibleTouchable({
  accessibilityLabel,
  accessibilityRole = "button",
  hitSlop = DEFAULT_HIT_SLOP,
  children,
  ...rest
}: AccessibleTouchableProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      hitSlop={hitSlop}
      {...rest}
    >
      {children}
    </Pressable>
  );
}