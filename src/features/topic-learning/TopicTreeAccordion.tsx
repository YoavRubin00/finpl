import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tapHaptic } from '../../utils/haptics';
import type { Module } from '../chapter-1-content/types';
import type { Topic } from './types';
import { resolveTopics } from './topicResolver';
import { useTopicProgressStore } from './useTopicProgressStore';
import { ModuleTopicLayout } from './components/ModuleTopicLayout';

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

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      exiting={FadeOut.duration(180)}
      style={styles.container}
    >
      <LinearGradient
        colors={['#0c1f3a', '#072144']}
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
    color: '#e0f2fe',
  },
  headerSpacer: { flex: 1 },
  headerPct: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fbbf24',
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
