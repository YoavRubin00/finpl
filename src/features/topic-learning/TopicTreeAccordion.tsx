import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { useUpsertModuleProgress } from '../chapter-1-content/useProgress';
import { useCompletedModulesStore } from '../economy/useCompletedModulesStore';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import type { Module } from '../chapter-1-content/types';
import type { Topic } from './types';
import { resolveTopics } from './topicResolver';
import { useTopicProgressStore } from './useTopicProgressStore';
import { ModuleTopicLayout } from './components/ModuleTopicLayout';

/** Base reward on topic-tree completion. Lower than the legacy
 *  LessonFlowScreen MODULE_COMPLETE_XP (30) because topics also yield
 *  per-topic micro-XP in a future loop. Tunable from a single point. */
const MODULE_TT_XP = 30;
const MODULE_TT_COINS = 150;

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface TopicTreeAccordionProps {
  module: Module;
  /** Whether sim is a SIM_FIRST topic for this module. Passed down so the
   *  resume CTA points at the right "next" component. */
  simFirst?: boolean;
  /** Fired when a chip is tapped. Parent owns the per-kind player sheet,
   *  the chip layer stays pure presentation. */
  onTopicSelected: (topic: Topic) => void;
}

/**
 * Expandable panel that renders inside DuoLearnScreen directly below a
 * module node when the module is `learningMode: 'topic-tree'`. Owns the
 * topic list derivation + progress read; defers the "open this topic"
 * sheet to the parent so DuoLearnScreen can mount any required modal at
 * the screen-root level (avoids nested-modal pitfalls on iOS).
 */
export const TopicTreeAccordion = React.memo(function TopicTreeAccordion({
  module,
  simFirst,
  onTopicSelected,
}: TopicTreeAccordionProps): React.ReactElement {
  const topics = useMemo(
    () => resolveTopics(module, { simFirst }),
    [module, simFirst],
  );

  // Subscribe to the `completed` map so chip glow + tree progress react
  // immediately when markTopicCompleted fires (player closes → store
  // writes → this re-renders).
  const completedMap = useTopicProgressStore((s) => s.completed);
  const summarize = useTopicProgressStore((s) => s.summaryForModule);
  const summary = useMemo(
    () => summarize(module.id, topics),
    // summarize is stable across renders (Zustand selector); recompute
    // only when topics or completion map shifts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [module.id, topics, completedMap],
  );

  const isCompletedMap = useMemo(() => {
    const out: Record<string, boolean> = {};
    topics.forEach((t) => { out[t.id] = Boolean(completedMap[t.id]); });
    return out;
  }, [topics, completedMap]);

  const handleResume = useCallback(() => {
    if (!summary.nextTopic) return;
    tapHaptic();
    onTopicSelected(summary.nextTopic);
  }, [summary.nextTopic, onTopicSelected]);

  // Module completion side effects on first 70%-threshold crossing.
  // Detection: useRef to remember the previous frame's `isModuleDone`, fire
  // the celebration only on the transition false→true. Re-mounting is
  // handled by `modulesPastThreshold` in the store — a remount AFTER the
  // user already crossed once does NOT re-fire (the ref initializes to
  // the persisted truth, not false).
  const wasDoneRef = useRef<boolean>(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const upsertProgress = useUpsertModuleProgress();
  const { playSound } = useSoundEffect();
  const economyStore = useEconomyUIStore();

  // Seed ref from the persisted threshold map on mount so a re-mount
  // post-crossing doesn't re-trigger the celebration.
  const modulePastThreshold = useTopicProgressStore(
    (s) => Boolean(s.modulesPastThreshold[module.id]),
  );
  useEffect(() => {
    wasDoneRef.current = modulePastThreshold;
    // Only on mount; we want React-side state to match the persisted truth
    // exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (summary.isModuleDone && !wasDoneRef.current) {
      wasDoneRef.current = true;
      // 1. Server progress sync (optimistic via the existing mutation).
      upsertProgress.mutate({
        moduleId: module.id,
        status: 'completed',
        xpEarned: MODULE_TT_XP,
      });
      // 2. Durable local completion record — same pattern LessonFlowScreen
      // uses so the DuoLearnScreen node flips to "completed" immediately,
      // not after the next progressQueryKey refetch.
      useCompletedModulesStore.getState().markCompleted(module.id);
      // 3. Direct XP/coins grant (mirrors the chest tap in LessonFlowScreen).
      economyStore.addXP(MODULE_TT_XP, 'daily_task');
      // 'lesson' source matches the legacy chest-tap flow in
      // LessonFlowScreen; analytics keyed on `source` stays comparable.
      economyStore.addCoins(MODULE_TT_COINS, 'lesson');
      // 4. Celebration UX.
      successHaptic();
      try { playSound('modal_open_4'); } catch { /* non-fatal */ }
      setShowCelebration(true);
    }
  }, [summary.isModuleDone, module.id, upsertProgress, economyStore, playSound]);

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      exiting={FadeOut.duration(180)}
      style={styles.container}
    >
      {/* Light sky-tinted gradient so the accordion reads as part of the
          Duolingo-style learning surface rather than a heavy modal — the
          gold tree pops against this far better than against navy. */}
      <LinearGradient
        colors={['#e0f2fe', '#bae6fd']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bg}
      >
        {/* Progress header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerCount, RTL]} allowFontScaling={false}>
            {`${summary.completed}/${summary.total}`}
          </Text>
          <View style={styles.headerSpacer} />
          <Text style={[styles.headerPct, RTL]} allowFontScaling={false}>
            {`${summary.pct}%`}
          </Text>
        </View>

        {/* Tree + orbital chips */}
        <ModuleTopicLayout
          topics={topics}
          isCompletedMap={isCompletedMap}
          recommendedTopicId={summary.nextTopic?.id ?? null}
          progressPct={summary.pct}
          onTopicPress={onTopicSelected}
        />

        {/* 70%-threshold celebration. Confetti fires once and the badge
            fades out 2.4s later. Server sync + XP/coins grant + local
            completion already fired in the useEffect above. */}
        {showCelebration && (
          <View pointerEvents="none" style={styles.celebrationLayer}>
            <ConfettiExplosion onComplete={() => setShowCelebration(false)} />
            <View style={styles.celebrationBadge}>
              <Text style={styles.celebrationText} allowFontScaling={false}>
                כל הכבוד! המודולה הושלמה 🎉
              </Text>
              <Text style={styles.celebrationSub} allowFontScaling={false}>
                {`+${MODULE_TT_XP} XP   +${MODULE_TT_COINS} מטבעות`}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom CTA — resumes at the first uncompleted topic. When the
            module is fully done, the CTA flips to "סיים מודולה" but
            still routes through onTopicSelected → playerAdapter, which
            no-ops gracefully if every kind is already done. */}
        {summary.nextTopic ? (
          <Pressable
            onPress={handleResume}
            accessibilityRole="button"
            accessibilityLabel={`המשך מאיפה שעצרתי, ${summary.nextTopic.titleHe}`}
            style={styles.cta}
          >
            <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
              {`המשך: ${summary.nextTopic.titleHe}`}
            </Text>
            <ChevronLeft size={18} color="#ffffff" strokeWidth={2.6} />
          </Pressable>
        ) : (
          <View style={[styles.cta, styles.ctaDone]} accessible={false}>
            <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
              סיימת את כל הרכיבים 🌳
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  bg: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.30)',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerCount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0c4a6e',
  },
  headerSpacer: { flex: 1 },
  headerPct: {
    fontSize: 14,
    fontWeight: '900',
    color: '#b45309', // gold-amber accent, matches the gold tree's tone
  },
  cta: {
    marginTop: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  ctaDone: {
    backgroundColor: '#16a34a',
    borderBottomColor: '#14532d',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  celebrationLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  celebrationBadge: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    alignItems: 'center',
  },
  celebrationText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  celebrationSub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fffbeb',
    marginTop: 4,
    writingDirection: 'rtl',
  },
});
