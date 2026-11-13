import React, { type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image as ExpoImage, type ImageSource } from "expo-image";
import { FINN_EMPATHIC } from "../../features/retention-loops/finnMascotConfig";
import { SupercellButton } from "./SupercellButton";

/**
 * EmptyState — the ONE "nothing here yet" / "could not load" block.
 *
 * BRAND.md: never a bare apology and never "בקרוב". An empty screen states the
 * fact in a few words and offers the next action. So: Captain Shark, a short
 * title, one optional line, and one optional button (the shared SupercellButton).
 *
 * Use `tone="error"` + an action labelled "נסו שוב" for a failed load.
 *
 * Copy rules for callers: system voice = second person plural ("עוד לא שמרתם"),
 * title up to ~5 words, body up to ~12, 0-1 emoji.
 */
export interface EmptyStateProps {
  title: string;
  body?: string;
  /** Label of the single CTA. Omit for a purely informational empty state. */
  actionLabel?: string;
  onAction?: () => void;
  /** Replace the default mascot (e.g. a Lottie the screen already uses). */
  illustration?: ReactNode;
  /** Mascot image override. Defaults to the empathic Captain Shark. */
  mascot?: ImageSource;
  /** "error" tints the title for a failed load. */
  tone?: "default" | "error";
  /** Tighter paddings + smaller mascot, for use inside a card or a grid. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  illustration,
  mascot = FINN_EMPATHIC,
  tone = "default",
  compact = false,
  style,
}: EmptyStateProps): React.ReactElement {
  const mascotSize = compact ? 64 : 96;
  return (
    <View style={[styles.root, compact && styles.rootCompact, style]}>
      {illustration ?? (
        <ExpoImage
          source={mascot}
          style={{ width: mascotSize, height: mascotSize }}
          contentFit="contain"
          accessible={false}
        />
      )}
      <Text
        style={[styles.title, compact && styles.titleCompact, tone === "error" && styles.titleError]}
        maxFontSizeMultiplier={1.3}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {body ? (
        <Text style={[styles.body, compact && styles.bodyCompact]} maxFontSizeMultiplier={1.3}>
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <SupercellButton label={actionLabel} variant="blue" size={compact ? "sm" : "md"} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 10,
  },
  rootCompact: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0c4a6e",
    textAlign: "center",
    writingDirection: "rtl",
  },
  titleCompact: {
    fontSize: 15,
  },
  titleError: {
    color: "#b91c1c",
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
    color: "#475569",
    textAlign: "center",
    writingDirection: "rtl",
  },
  bodyCompact: {
    fontSize: 13,
    lineHeight: 19,
  },
  action: {
    marginTop: 8,
    minWidth: 180,
  },
});
