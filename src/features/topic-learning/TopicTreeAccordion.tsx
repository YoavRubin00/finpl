import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { successHaptic } from '../../utils/haptics';
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

interface TopicTreeAccordionProps {
  module: Module;
  /** Whether sim is a SIM_FIRST topic for this module. Reorders the
   *  resolved topic list so sim falls earlier in canonical sequence. */
  simFirst?: boolean;
  /** Fired when a chip is tapped. Parent navigates to the legacy
   *  LessonFlowScreen with phase-targeted entry; the topic-tree layer
   *  stays pure presentation. */
  onTopicSelected: (topic: Topic) => void;
  /** "המשך עם המודולה" inside the chest modal — dismiss the modal but
   *  keep the accordion open so the user can knock out the remaining
   *  30%. */
  onContinueAfterChest?: () => void;
  /** "לשיעור הבא בפרק" inside the chest modal — close accordion AND
   *  navigate to the next module's lesson (legacy LessonFlowScreen). */
  onAdvanceToNextModule?: () => void;
  /** Fired on the first false→true crossing of the 70% threshold AND
   *  on the user's choice in the chest modal. Parent dismisses the
   *  accordion after the user's interaction. */
  onModuleCompleted?: () => void;
}

/**
 * Expandable panel rendered inside DuoLearnScreen directly below a
 * module node when the module is `learningMode: 'topic-tree'`.
 *
 * R4 (2026-06-09): trimmed to a transparent surface — no rectangle
 * background, no progress header, no bottom CTA. It's literally just
 * the tree + chip path, sized to flow inside the outer DuoLearnScreen
 * ScrollView. Chip tap routes to the legacy /lesson/[id] with
 * phase-targeted entry (see DuoLearnScreen.handleTopicSelected).
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

  const completedMap = useTopicProgressStore((s) => s.completed);
  const summarize = useTopicProgressStore((s) => s.summaryForModule);
  const summary = useMemo(
    () => summarize(module.id, topics),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [module.id, topics, completedMap],
  );

  const isCompletedMap = useMemo(() => {
    const out: Record<string, boolean> = {};
    topics.forEach((t) => { out[t.id] = Boolean(completedMap[t.id]); });
    return out;
  }, [topics, completedMap]);

  // Module completion side effects on first 70%-threshold crossing.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (summary.isModuleDone && !wasDoneRef.current) {
      wasDoneRef.current = true;
      upsertProgress.mutate({
        moduleId: module.id,
        status: 'completed',
        xpEarned: MODULE_TT_XP,
      });
      useCompletedModulesStore.getState().markCompleted(module.id);
      economyStore.addXP(MODULE_TT_XP, 'daily_task');
      economyStore.addCoins(MODULE_TT_COINS, 'lesson');
      successHaptic();
      try { playSound('modal_open_4'); } catch { /* non-fatal */ }
      setShowChest(true);
    }
  }, [summary.isModuleDone, module.id, upsertProgress, economyStore, playSound]);

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      exiting={FadeOut.duration(180)}
    >
      <View>
        {/* Tree + path chips, no surrounding rectangle so the accordion
            reads as a continuation of the outer module path. */}
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
      </View>
    </Animated.View>
  );
});
