import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { getGlossaryEntry } from '../../features/glossary/glossaryData';

const RTL_STYLE = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface GlossaryTooltipProps {
  term: string | null;
  onClose: () => void;
}

export function GlossaryTooltip({ term, onClose }: GlossaryTooltipProps) {
  if (!term) return null;

  const entry = getGlossaryEntry(term);
  if (!entry) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutDown.duration(200)}
      style={styles.overlay}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="סגור הסבר" />
      <View style={styles.tooltipContainer} pointerEvents="box-none">
        <View style={styles.tooltipCard}>
          <View style={styles.header}>
            <Text style={styles.emoji}>{entry.emoji}</Text>
            <Text style={styles.title}>{entry.term}</Text>
          </View>
          <Text style={styles.definition}>{entry.definition}</Text>
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="הבנתי!">
            <Text style={styles.closeButtonText}>הבנתי!</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tooltipContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  tooltipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    ...RTL_STYLE,
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  definition: {
    ...RTL_STYLE,
    fontSize: 16,
    lineHeight: 24,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#0284c7',
  },
  closeButtonText: {
    ...RTL_STYLE,
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
