import React, { type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { BackButton } from "./BackButton";
import { SheetCloseButton } from "./SheetCloseButton";

/**
 * ScreenHeader — the ONE top bar for inner (non-tab) screens.
 *
 * Before this, every inner screen hand-rolled its own bar: the title was
 * 18/20/22pt and 700/800/900 weight, the back button sat on the right in
 * some screens and was an arrow pointing the wrong way in others, and the
 * spacer that centres the title was 32/36/40/44/60px wide.
 *
 * Contract (the app forces LTR layout and writes rows as `row-reverse`, see
 * app/_layout.tsx, so "leading" = the RIGHT edge for a Hebrew reader):
 *   - leading slot (right): back chevron pointing right, or a close X
 *   - title: centred, one line, 18pt / 900, shrinks instead of clipping
 *   - trailing slot (left): optional action; otherwise an equal-width spacer
 *     so the title stays optically centred
 *   - every slot is at least 44pt (PRD-ACCESSIBILITY R5)
 *
 * It does NOT own the safe area: host it inside a `SafeAreaView edges={['top']}`
 * (or below a GlobalWealthHeader), like the bars it replaces.
 */
export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  /** "back" (default) = chevron, "close" = X for screens presented as an overlay, "none" = no leading control. */
  leading?: "back" | "close" | "none";
  /** Overrides the default behaviour (router.back(), falling back to the learning map). */
  onLeadingPress?: () => void;
  /** Screen-reader label for the leading control. Defaults: "חזרה" / "סגור". */
  leadingLabel?: string;
  /** Optional action rendered on the trailing (left) edge. */
  trailing?: ReactNode;
  /** Title + back-chevron colour. Defaults to the deep-ocean ink used on light screens. */
  tint?: string;
  /** Hairline under the bar, for screens whose content scrolls beneath it. */
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_TINT = "#0c4a6e";
const SLOT = 44;

export function ScreenHeader({
  title,
  subtitle,
  leading = "back",
  onLeadingPress,
  leadingLabel,
  trailing,
  tint = DEFAULT_TINT,
  bordered = false,
  style,
}: ScreenHeaderProps): React.ReactElement {
  return (
    <View style={[styles.bar, bordered && styles.bordered, style]}>
      <View style={[styles.slot, styles.leadingSlot]}>
        {leading === "back" ? (
          <BackButton color={tint} onPress={onLeadingPress} accessibilityLabel={leadingLabel} />
        ) : leading === "close" && onLeadingPress ? (
          <SheetCloseButton onPress={onLeadingPress} accessibilityLabel={leadingLabel} />
        ) : null}
      </View>

      <View style={styles.titleWrap}>
        {title ? (
          <Text
            style={[styles.title, { color: tint }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={1.3}
            accessibilityRole="header"
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.slot, styles.trailingSlot]}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 56,
    gap: 8,
  },
  bordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  slot: {
    minWidth: SLOT,
    minHeight: SLOT,
    justifyContent: "center",
  },
  // row-reverse: the leading slot hugs the right edge, the trailing one the left.
  leadingSlot: { alignItems: "flex-end" },
  trailingSlot: { alignItems: "flex-start" },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    writingDirection: "rtl",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
    writingDirection: "rtl",
  },
});
