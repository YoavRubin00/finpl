import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react-native';
import { tapHaptic } from '../../../../utils/haptics';
import { getEntry, type GlossaryKey } from './glossary';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  glossaryKey: GlossaryKey;
  onInteract?: () => void;
  /**
   * Compact variant — shorter height, smaller icons, term-only label (no "מה זה"
   * prefix). Use when multiple toggles stack and would otherwise overflow the
   * screen (e.g., Bullshit Swipe explanations with 3+ glossary references).
   */
  compact?: boolean;
  /**
   * Where the definition body expands. Default 'down' pushes layout below the
   * button; 'up' overlays the area above the button (absolute) so a trailing
   * CTA right beneath the toggle doesn't get shoved off-screen.
   */
  direction?: 'up' | 'down';
}

/**
 * Inline glossary toggle — button expands to show definition + example
 * in-place, without navigating or opening a modal. Matches the dividend
 * explainer pattern used in BullshitSwipe feedback state.
 */
export function GlossaryInlineToggle({ glossaryKey, onInteract, compact = false, direction = 'down' }: Props) {
  const [open, setOpen] = useState(false);
  const entry = getEntry(glossaryKey);

  const iconSize = compact ? 16 : 20;
  const chevronSize = compact ? 16 : 20;
  const labelText = compact ? entry.term : `מה זה ${entry.term}?`;

  const bodyContent = open && (
    <Animated.View
      entering={FadeInUp.duration(220)}
      style={[styles.body, direction === 'up' && styles.bodyUp]}
    >
      <Text style={[styles.definition, RTL]}>{entry.shortDefinition}</Text>
      {entry.example && (
        <View style={styles.example}>
          <Text style={[styles.exampleLabel, RTL]}>דוגמה</Text>
          <Text style={[styles.exampleText, RTL]}>{entry.example}</Text>
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={styles.wrapper}>
      {direction === 'up' && bodyContent}

      <View style={[styles.depth, compact && styles.depthCompact]} pointerEvents="none" />
      <Pressable
        onPress={() => {
          tapHaptic();
          onInteract?.();
          setOpen((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${open ? 'סגור' : 'פתח'} הסבר: ${entry.term}`}
        accessibilityState={{ expanded: open }}
        hitSlop={12}
        style={({ pressed }) => [
          styles.toggleBtn,
          compact && styles.toggleBtnCompact,
          pressed && { transform: [{ translateY: 2 }] },
        ]}
      >
        <View style={styles.toggleRow}>
          <View style={[styles.iconSlot, compact && styles.iconSlotCompact]}>
            <BookOpen size={iconSize} color="#ffffff" strokeWidth={2.5} />
          </View>
          <Text
            style={[styles.toggleText, compact && styles.toggleTextCompact]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {labelText}
          </Text>
          <View style={[styles.iconSlot, compact && styles.iconSlotCompact]}>
            {open ? (
              <ChevronDown size={chevronSize} color="#ffffff" strokeWidth={3} />
            ) : (
              <ChevronUp size={chevronSize} color="#ffffff" strokeWidth={3} />
            )}
          </View>
        </View>
      </Pressable>

      {direction === 'down' && bodyContent}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    width: '100%',
    position: 'relative',
  },
  depth: {
    position: 'absolute',
    top: 5,
    left: 0,
    right: 0,
    bottom: -5,
    borderRadius: 14,
    backgroundColor: '#075985',
  },
  toggleBtn: {
    alignSelf: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 22,
    minHeight: 104,
    borderRadius: 16,
    backgroundColor: '#0369a1',
    borderWidth: 1.5,
    borderColor: '#075985',
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  // ── Compact variant — used when several toggles stack in one card ──
  toggleBtnCompact: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 0,
    borderRadius: 12,
  },
  depthCompact: {
    top: 3,
    bottom: -3,
    borderRadius: 12,
  },
  iconSlotCompact: {
    width: 20,
    height: 20,
  },
  toggleTextCompact: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  iconSlot: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toggleText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'right',
  },
  // Body now sits below the button in normal flow — earlier absolute-positioning
  // above caused the feed scroll to feel jumpy when the definition popped in.
  body: {
    marginTop: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.3)',
    gap: 10,
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  // direction="up" — body overlays the area above the button so a CTA directly
  // beneath the toggle (e.g. "בואו נתחיל" in Cashout-Rush idle) stays anchored.
  bodyUp: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginTop: 0,
    marginBottom: 8,
    zIndex: 20,
    elevation: 14,
    shadowOffset: { width: 0, height: -4 },
  },
  definition: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1e293b',
    fontWeight: '600',
  },
  example: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
    gap: 4,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0891b2',
    letterSpacing: 0.5,
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
  },
});
