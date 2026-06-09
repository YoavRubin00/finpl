import React, { useCallback } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import { Image as ExpoImage } from 'expo-image';
import { X, Check } from 'lucide-react-native';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import type { Module } from '../chapter-1-content/types';
import type { Topic, TopicKind } from './types';
import { useTopicProgressStore } from './useTopicProgressStore';
import { IntroPlayer } from './playerAdapters/IntroPlayer';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface TopicPlayerHostProps {
  topic: Topic | null;
  /** Needed by adapters that read other module fields (intro text, audio,
   *  flashcards, etc.). Looked up by the host's caller. */
  module: Module | null;
  onClose: () => void;
}

/**
 * Routes a tapped topic to the right per-kind player. Each kind opens
 * IMMEDIATELY when its chip is tapped — no intermediate "start the
 * topic?" confirmation. The hub-sheet pattern was retired 2026-06-09
 * per Yoav's spec ("שיתחיל את הרכיב מיד בלחיצה, בלי צורך לאשר").
 *
 * Pilot scope: only IntroPlayer ships as a real adapter (reuses the
 * legacy InteractiveIntroCard). Other kinds fall through to
 * `PreviewPlayer` — a focused single-screen with the topic's animated
 * icon + a "סיים רכיב" CTA that marks completion. This unlocks the
 * 70%-threshold celebration end-to-end for QA without needing all 10
 * per-kind native adapters built up-front. Future loops swap each
 * preview for a real wrapper around the matching legacy component
 * (cards/quiz/sim/podcast/...).
 */
function isImageAsset(asset: Topic['iconAsset']): asset is number {
  return typeof asset === 'number';
}

const KIND_DESCRIPTIONS: Record<TopicKind, string> = {
  'video-hook': 'סרטון פתיחה קצר שמכניס אותך לרוח של הנושא',
  'intro': '', // intro uses IntroPlayer directly; no description shown
  'cards': 'כרטיסיות מידע אינטראקטיביות עם הסברי פין',
  'recall': 'תרגיל קצר להחזרת מה שלמדת בכרטיסיות',
  'podcast': 'פודקאסט של 20 שניות + שאלת המשך',
  'couple-dilemma': 'דילמה זוגית עם החלקה ימינה-שמאלה',
  'quiz': 'קוויז בחירה מרובה - 2-4 שאלות',
  'sim': 'סימולטור אינטראקטיבי של ריבית דריבית',
  'infographic': 'אינפוגרפיקת סיכום של הנושא',
  'post-video': 'סרטון חגיגה של פין בסיום',
};

/** Minimal preview screen for kinds without a dedicated adapter yet.
 *  Single CTA — taps to mark complete. */
function PreviewPlayer({
  topic,
  onComplete,
  onDismiss,
}: {
  topic: Topic;
  onComplete: () => void;
  onDismiss: () => void;
}): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { playSound } = useSoundEffect();

  const handleComplete = useCallback(() => {
    successHaptic();
    try { playSound('modal_open_4'); } catch { /* non-fatal */ }
    onComplete();
  }, [onComplete, playSound]);

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.closeRow}>
          <Pressable
            onPress={onDismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="סגירה"
            style={styles.closeBtn}
          >
            <X size={22} color="#0c4a6e" strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={styles.previewBody}>
          <View style={styles.previewIconWrap}>
            {isImageAsset(topic.iconAsset) ? (
              <ExpoImage source={topic.iconAsset} style={styles.previewIcon} contentFit="contain" />
            ) : (
              <LottieView source={topic.iconAsset as AnimationObject} autoPlay loop style={styles.previewIcon} />
            )}
          </View>
          <Text style={[styles.previewTitle, RTL_CENTER]} allowFontScaling={false}>
            {topic.titleHe}
          </Text>
          <Text style={[styles.previewBlurb, RTL_CENTER]} allowFontScaling={false}>
            {KIND_DESCRIPTIONS[topic.kind]}
          </Text>
          <Text style={[styles.previewDevNote, RTL_CENTER]} allowFontScaling={false}>
            פילוט: הרכיב הזה עוד לא משוקע במלואו ב-Topic Tree. לחיצה על
            "סיים רכיב" תסמן השלמה ותחזיר אותך לעץ.
          </Text>
        </View>

        <View style={[styles.ctaRow, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable
            onPress={handleComplete}
            accessibilityRole="button"
            accessibilityLabel="סיים רכיב"
            style={styles.ctaPrimary}
          >
            <Check size={20} color="#ffffff" strokeWidth={3} />
            <Text style={[styles.ctaPrimaryText, RTL]} allowFontScaling={false}>
              סיים רכיב
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export function TopicPlayerHost({
  topic,
  module,
  onClose,
}: TopicPlayerHostProps): React.ReactElement | null {
  const markTopicCompleted = useTopicProgressStore((s) => s.markTopicCompleted);

  const handleComplete = useCallback(() => {
    if (!topic) return;
    markTopicCompleted(topic);
    onClose();
  }, [topic, markTopicCompleted, onClose]);

  const handleDismiss = useCallback(() => {
    tapHaptic();
    onClose();
  }, [onClose]);

  if (!topic || !module) return null;

  if (topic.kind === 'intro') {
    return (
      <IntroPlayer
        module={module}
        onComplete={handleComplete}
        onDismiss={handleDismiss}
      />
    );
  }

  return (
    <PreviewPlayer
      topic={topic}
      onComplete={handleComplete}
      onDismiss={handleDismiss}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#e0f2fe',
  },
  closeRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  previewIconWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 80,
    backgroundColor: '#ffffff',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  previewIcon: {
    width: 140,
    height: 140,
  },
  previewTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0c4a6e',
    marginTop: 8,
  },
  previewBlurb: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 22,
    maxWidth: 320,
  },
  previewDevNote: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 8,
    maxWidth: 280,
    lineHeight: 16,
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
  ctaPrimaryText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
});
