import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LL_COLORS, RTL_STYLE } from "../tokens";

/**
 * Shared chrome for every visual primitive: dark panel, rounded, optional
 * caption underneath. Keeps every visual's total height inside the
 * ~180-220px budget (stage + caption) regardless of which primitive it is.
 */
interface VisualFrameProps {
  children: React.ReactNode;
  caption?: string;
  /** Minimum height of the stage area (excludes caption). Default 130. */
  minHeight?: number;
}

export function VisualFrame({ children, caption, minHeight = 130 }: VisualFrameProps) {
  return (
    <View style={styles.frame}>
      <View style={[styles.stage, { minHeight }]}>{children}</View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    backgroundColor: LL_COLORS.bgPanel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LL_COLORS.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  stage: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  caption: {
    ...RTL_STYLE,
    textAlign: "center",
    color: LL_COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 10,
  },
});
