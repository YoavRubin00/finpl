import React, { useCallback } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import { X, Play, Check } from 'lucide-react-native';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import type { Topic } from './types';
import { useTopicProgressStore } from './useTopicProgressStore';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface TopicPlayerSheetProps {
  topic: Topic | null;
  /** Optional: jump to LessonFlowScreen at the matching phase. The pilot
   *  doesn't yet support phase-targeted entry, so for now the entire
   *  module re-plays from the start — explicit and predictable for QA.
   *  Production: replace with a phase-targeted route. */
  onStartLesson?: (topic: Topic) => void;
  onClose: () => void;
}

const PHASE_DESCRIPTION: Record<Topic['kind'], string> = {
  'video-hook': 'סרטון הפתיחה של הנושא — 15 שניות, ללא נגן עצמי בשלב זה',
  'intro': 'אינטרו מוקלט של קפטן שארק עם תמונה ראשית',
  'cards': 'כרטיסיות מידע אינטראקטיביות עם הסברי פין',
  'recall': 'השלמת משפטים מהכרטיסיות',
  'podcast': 'פודקאסט של 20 שניות + 2 שאלות',
  'couple-dilemma': 'דילמה זוגית עם סוויפ ימינה-שמאלה',
  'quiz': 'קוויז בחירה מרובה — 2-4 שאלות',
  'sim': 'סימולטור אינטראקטיבי של הנושא',
  'infographic': 'אינפוגרפיקת סיכום של הנושא',
  'post-video': 'סרטון חגיגה של פין בסיום',
};

/**
 * Bottom sheet that hosts the per-topic experience. v1 ships as a hub
 * with two routes:
 *   1. "התחל את הרכיב" — opens the legacy LessonFlowScreen for the host
 *      module (whole module replays). Wires existing rich content
 *      without rewriting per kind. Acceptable for the pilot because
 *      users still see real content per topic; closing the lesson after
 *      reaching the matching phase counts as completion.
 *   2. "סמן כהושלם" — direct completion, for QA + power users who only
 *      want to mark progress.
 *
 * Future loops will replace this hub with per-kind dedicated players
 * (IntroPlayer, CardsPlayer, ...) that own a focused mini-experience
 * without leaving the topic-tree context.
 */
export function TopicPlayerSheet({
  topic,
  onStartLesson,
  onClose,
}: TopicPlayerSheetProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const markTopicCompleted = useTopicProgressStore((s) => s.markTopicCompleted);
  const isCompleted = useTopicProgressStore(
    (s) => (topic ? Boolean(s.completed[topic.id]) : false),
  );
  const { playSound } = useSoundEffect();

  const handleMarkComplete = useCallback(() => {
    if (!topic) return;
    successHaptic();
    try { playSound('modal_open_4'); } catch { /* non-fatal */ }
    markTopicCompleted(topic);
    onClose();
  }, [topic, markTopicCompleted, onClose, playSound]);

  const handleStartLesson = useCallback(() => {
    if (!topic) return;
    tapHaptic();
    onStartLesson?.(topic);
  }, [topic, onStartLesson]);

  if (!topic) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="סגירה" />
      <Animated.View
        entering={FadeIn.duration(220)}
        style={[styles.sheet, { paddingBottom: 18 + insets.bottom }]}
      >
        <SafeAreaView edges={['bottom']} style={{ flex: 0 }}>
          {/* Header: close-X + title with Lottie icon */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="סגירה"
              style={styles.closeBtn}
            >
              <X size={20} color="#0c4a6e" strokeWidth={2.6} />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text style={[styles.title, RTL]} allowFontScaling={false}>
                {topic.titleHe}
              </Text>
              <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                {PHASE_DESCRIPTION[topic.kind]}
              </Text>
            </View>
          </View>

          {/* Animated icon */}
          <View style={styles.iconWrap}>
            <LottieView
              source={topic.iconAsset as AnimationObject}
              autoPlay
              loop
              style={styles.icon}
            />
          </View>

          {/* Status pill if already done */}
          {isCompleted && (
            <View style={styles.donePill} accessible={false}>
              <Check size={14} color="#ffffff" strokeWidth={3} />
              <Text style={styles.donePillText} allowFontScaling={false}>
                כבר השלמת רכיב זה
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleStartLesson}
              accessibilityRole="button"
              accessibilityLabel="התחל את הרכיב"
              style={[styles.btn, styles.btnPrimary]}
            >
              <Play size={18} color="#ffffff" strokeWidth={2.6} fill="#ffffff" />
              <Text style={styles.btnPrimaryText} allowFontScaling={false}>
                התחל את הרכיב
              </Text>
            </Pressable>

            {!isCompleted && (
              <Pressable
                onPress={handleMarkComplete}
                accessibilityRole="button"
                accessibilityLabel="סמן כהושלם"
                style={[styles.btn, styles.btnGhost]}
              >
                <Check size={16} color="#0ea5e9" strokeWidth={3} />
                <Text style={styles.btnGhostText} allowFontScaling={false}>
                  סמן כהושלם
                </Text>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f9ff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 16,
    shadowColor: '#0369a1',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 20,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(14,165,233,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    paddingTop: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0c4a6e',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  icon: {
    width: 110,
    height: 110,
  },
  donePill: {
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    marginBottom: 8,
  },
  donePillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  btnPrimary: {
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.5)',
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0ea5e9',
    writingDirection: 'rtl',
  },
});
