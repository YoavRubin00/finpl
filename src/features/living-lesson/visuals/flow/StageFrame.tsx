import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { RotateCcw } from "lucide-react-native";
import { LL_COLORS, RTL_STYLE } from "../../tokens";

interface StageFrameProps {
  children: React.ReactNode;
  /** Height of the stage (the moving area). */
  height: number;
  /** What a screen reader hears instead of the moving parts. */
  a11y: string;
  caption?: string;
  /** Shows the "לדוגמה" tag above the stage. */
  example?: boolean;
  /** Rendered beside the caption (Captain Shark's reaction). */
  aside?: React.ReactNode;
  /** When set, a replay button sits beside the caption. */
  onReplay?: () => void;
  onStageLayout?: (e: LayoutChangeEvent) => void;
}

/**
 * The chrome every living diagram shares: FinPlay's white card with the
 * pressed bottom edge, a sky-to-violet stage, the caption row with the
 * replay button. The dot grid and the moving parts are the children.
 */
export function StageFrame({ children, height, a11y, caption, example, aside, onReplay, onStageLayout }: StageFrameProps) {
  return (
    <View style={styles.frame}>
      {example ? (
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>לדוגמה</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.stage, { height }]} onLayout={onStageLayout} accessible accessibilityRole="image" accessibilityLabel={a11y}>
        <LinearGradient colors={["#f0f9ff", "#ffffff", "#f5f3ff"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
        {children}
      </View>

      <View style={styles.footer}>
        {aside}
        {caption ? <Text style={styles.caption}>{caption}</Text> : <View style={styles.captionSpacer} />}
        {onReplay ? (
          <Pressable
            onPress={onReplay}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="הפעלה מחדש של ההמחשה"
            style={({ pressed }) => [styles.replay, pressed ? styles.replayPressed : null]}
          >
            <RotateCcw size={15} color={LL_COLORS.brandCyanBright} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>
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
    borderBottomWidth: 3,
    borderBottomColor: "rgba(2,132,199,0.22)",
    padding: 10,
    overflow: "hidden",
  },
  tagRow: {
    flexDirection: "row-reverse",
    marginBottom: 6,
  },
  tag: {
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  tagText: {
    ...RTL_STYLE,
    color: "#92400e",
    fontSize: 11,
    fontWeight: "800",
  },
  stage: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(2,132,199,0.10)",
  },
  footer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    minHeight: 32,
  },
  caption: {
    ...RTL_STYLE,
    flex: 1,
    textAlign: "center",
    color: LL_COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
  },
  captionSpacer: {
    flex: 1,
  },
  replay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LL_COLORS.bgCard,
    borderWidth: 1,
    borderColor: LL_COLORS.border,
  },
  replayPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
});
