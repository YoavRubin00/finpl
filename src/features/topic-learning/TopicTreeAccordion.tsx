import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { useUpsertModuleProgress } from '../chapter-1-content/useProgress';
import { ChestCelebrationModal } from './ChestCelebrationModal';
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
  /** "המשך עם המודולה" inside the chest modal — dismiss the modal but
   *  keep the accordion open so the user can knock out the remaining
   *  30%. Optional; if missing, equivalent to onModuleCompleted. */
  onContinueAfterChest?: () => void;
  /** "לשיעור הבא בפרק" inside the chest modal — close accordion AND
   *  navigate to the next module's lesson (legacy LessonFlowScreen for
   *  non-topic-tree modules). */
  onAdvanceToNextModule?: () => void;
  /** Fired on the first false→true crossing of the 70% threshold AND on
   *  the user's choice in the chest modal. Parent dismisses the
   *  accordion ("חזרה למסך הראשי") after the user's interaction. */
  onModuleCompleted?: () => void;
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
  onContinueAfterChest,
  onAdvanceToNextModule,
  onModuleCompleted,
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
  const [showChest, setShowChest] = useState(false);
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
      // 4. Celebration UX — chest modal opens. The user picks "continue"
      // (stay in accordion) or "next module in chapter" (navigate +
      // collapse). Parent dismissal is fired by the user's CTA tap on
      // the modal, NOT automatically here.
      successHaptic();
      try { playSound('modal_open_4'); } catch { /* non-fatal */ }
      setShowChest(true);
    }
  }, [summary.isModuleDone, module.id, upsertProgress, economyStore, playSound]);

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      exiting={FadeOut.duration(180)}
      style={styles.container}
    >
      {/* Light theme aligned to the main learn-screen palette. Chapter-1
          glow (#bfdbfe → #eff6ff) keeps the accordion feeling like a
          slice of the outer module path rather than a foreign surface. */}
      <LinearGradient
        colors={['#ffffff', '#eff6ff']}
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

        {/* 70%-threshold celebration. Real chest modal — chest opens on
            tap, surfaces XP/coins, then offers two paths back. */}
        <ChestCelebrationModal
          visible={showChest}
          xp={MODULE_TT_XP}
          coins={MODULE_TT_COINS}
          onContinueModule={() => {
            setShowChest(false);
            onContinueAfterChest?.();
          }}
          onAdvanceToNextModule={() => {
            setShowChest(false);
            onAdvanceToNextModule?.();
            onModuleCompleted?.();
          }}
        />

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
    borderColor: 'rgba(59,130,246,0.22)',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerCount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e3a8a',
  },
  headerSpacer: { flex: 1 },
  headerPct: {
    fontSize: 14,
    fontWeight: '900',
    color: '#b45309', // amber on light bg, matches the gold tree
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
});
