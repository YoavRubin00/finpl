import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { X, ChevronLeft } from 'lucide-react-native';
import { successHaptic, tapHaptic } from '../../../utils/haptics';
import { FlashcardInfographic } from '../../chapter-1-content/FlashcardInfographic';
import type { Module } from '../../chapter-1-content/types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/** Clean glossary markup: `[[term|display]]` → display, `[[term]]` → term.
 *  Identical helper exists in several content components; duplicated here
 *  to avoid pulling the host components' regex into the topic-tree code. */
function cleanGlossaryMarkup(raw: string): string {
  return raw
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1');
}

interface CardsPlayerProps {
  module: Module;
  onComplete: () => void;
  onDismiss: () => void;
}

/**
 * Walks the user through `module.flashcards` one card at a time. Uses the
 * existing FlashcardInfographic for the visual half (NotebookLM PNGs +
 * Lottie animations) and renders the card's text above. Each "המשך" tap
 * advances. The last "המשך" fires onComplete.
 *
 * Glossary tooltips + dive-step zooms (from FlashcardInfographic's full
 * feature set) are intentionally NOT wired here — Phase 2 work. The
 * pilot's goal is for users to see real card content, not perfect
 * pedagogical depth.
 */
export function CardsPlayer({ module, onComplete, onDismiss }: CardsPlayerProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const total = module.flashcards.length;
  const card = module.flashcards[index];
  const cleanText = card ? cleanGlossaryMarkup(card.text) : '';

  const handleNext = useCallback(() => {
    if (index >= total - 1) {
      successHaptic();
      onComplete();
      return;
    }
    tapHaptic();
    setIndex((i) => i + 1);
  }, [index, total, onComplete]);

  return (
    <Modal visible animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
            <X size={22} color="#0c4a6e" strokeWidth={2.6} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={styles.progressPill}>
            <Text style={styles.progressText} allowFontScaling={false}>
              {`${index + 1}/${total}`}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card text — re-mounts on index change so the entrance anim
              fires fresh on each card. */}
          <Animated.View key={`text-${index}`} entering={FadeInUp.duration(280)}>
            <Text style={[styles.cardText, RTL]} allowFontScaling={false}>
              {cleanText}
            </Text>
          </Animated.View>

          {/* Infographic / Lottie for the card */}
          <Animated.View key={`fig-${index}`} entering={FadeIn.delay(120).duration(280)} style={styles.figureWrap}>
            {card && <FlashcardInfographic cardId={card.id} />}
          </Animated.View>
        </ScrollView>

        <View style={[styles.ctaRow, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={index === total - 1 ? 'סיים רכיב' : 'המשך לכרטיסיה הבאה'}
            style={styles.ctaPrimary}
          >
            <ChevronLeft size={20} color="#ffffff" strokeWidth={2.6} />
            <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
              {index === total - 1 ? 'סיימתי! 🎉' : 'המשך'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eff6ff',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.4)',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1e40af',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 18,
  },
  cardText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0c4a6e',
    lineHeight: 28,
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.25)',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  figureWrap: {
    alignItems: 'center',
    minHeight: 220,
  },
  ctaRow: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  ctaPrimary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
});
