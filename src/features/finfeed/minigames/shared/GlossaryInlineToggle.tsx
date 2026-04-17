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
}

/**
 * Inline glossary toggle — button expands to show definition + example
 * in-place, without navigating or opening a modal. Matches the dividend
 * explainer pattern used in BullshitSwipe feedback state.
 */
export function GlossaryInlineToggle({ glossaryKey, onInteract }: Props) {
  const [open, setOpen] = useState(false);
  const entry = getEntry(glossaryKey);

  return (
    <View style={styles.wrapper}>
      {open && (
        <Animated.View entering={FadeInUp.duration(220)} style={styles.body}>
          <Text style={[styles.definition, RTL]}>{entry.shortDefinition}</Text>
          {entry.example && (
            <View style={styles.example}>
              <Text style={[styles.exampleLabel, RTL]}>דוגמה</Text>
              <Text style={[styles.exampleText, RTL]}>{entry.example}</Text>
            </View>
          )}
        </Animated.View>
      )}

      <View style={styles.depth} pointerEvents="none" />
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
          pressed && { transform: [{ translateY: 2 }] },
        ]}
      >
        <View style={styles.toggleRow}>
          <View style={styles.iconSlot}>
            <BookOpen size={18} color="#ffffff" strokeWidth={2.5} />
          </View>
          <Text
            style={styles.toggleText}
            numberOfLines={2}
            allowFontScaling={false}
          >
            מה זה {entry.term}?
          </Text>
          <View style={styles.iconSlot}>
            {open ? (
              <ChevronDown size={22} color="#ffffff" strokeWidth={3} />
            ) : (
              <ChevronUp size={22} color="#ffffff" strokeWidth={3} />
            )}
          </View>
        </View>
      </Pressable>
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
    paddingHorizontal: 18,
    paddingVertical: 24,
    minHeight: 92,
    borderRadius: 14,
    backgroundColor: '#0369a1',
    borderWidth: 1.5,
    borderColor: '#075985',
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  iconSlot: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toggleText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16.5,
    lineHeight: 22,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'right',
  },
  body: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.3)',
    gap: 10,
    zIndex: 10,
    elevation: 14,
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
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
