import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

/**
 * LoadingState — the ONE lightweight "data is on its way" block.
 *
 * Use it wherever a screen or a card would otherwise be blank while a request
 * is in flight. Before this, ~20 files each placed a bare `ActivityIndicator`
 * with its own colour (white / cyan / indigo / grey), size and no text, so a
 * screen reader announced nothing and the spinner changed colour per screen.
 *
 * - `fill`: takes the remaining space and centres itself (whole-screen wait).
 * - default: an inline block with vertical padding (inside a card or list).
 * - For a long, branded wait (lesson content, AI analysis) use <SharkLoader>.
 *
 * The native spinner already respects the OS "reduce motion" setting, and the
 * label is announced politely once.
 */
export interface LoadingStateProps {
  /** Short Hebrew label, plural system voice. Defaults to "טוענים…". */
  label?: string;
  /** Stretch to fill the parent and centre (use for a whole-screen wait). */
  fill?: boolean;
  /** Spinner + label colour for dark surfaces. */
  tone?: "default" | "onDark";
  size?: "small" | "large";
  style?: StyleProp<ViewStyle>;
}

/** Brand loading accent, same cyan as the tab bar's active tab. */
export const LOADING_TINT = "#0891b2";

export function LoadingState({
  label = "טוענים…",
  fill = false,
  tone = "default",
  size = "large",
  style,
}: LoadingStateProps): React.ReactElement {
  const onDark = tone === "onDark";
  return (
    <View
      style={[styles.base, fill && styles.fill, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size={size} color={onDark ? "#ffffff" : LOADING_TINT} />
      {label ? (
        <Text style={[styles.label, onDark && styles.labelOnDark]} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 10,
  },
  fill: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
    writingDirection: "rtl",
  },
  labelOnDark: {
    color: "rgba(255,255,255,0.85)",
  },
});
