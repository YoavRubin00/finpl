import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { tapHaptic } from '../../utils/haptics';
import type { Module } from '../chapter-1-content/types';
import type { Topic } from './types';
import { TopicTreeAccordion } from './TopicTreeAccordion';
import { TopicPlayerSheet } from './TopicPlayerSheet';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface TopicTreeOverlayProps {
  module: Module;
  chapterId: string;
  /** Some chapter-1 modules opt into SIM_FIRST ordering (sim runs before
   *  cards/quiz). LessonFlowScreen carries that list — pass it through
   *  so the resume CTA orders topics consistently. */
  simFirst?: boolean;
  onClose: () => void;
}

/**
 * Full-screen overlay that hosts the topic tree. Replaces routing to
 * LessonFlowScreen for modules flagged `learningMode: 'topic-tree'`.
 *
 * Design note: the spec asked for inline expansion under the module node
 * in the sine-wave path. v1 ships as a slide-up overlay instead because
 * inline expansion requires restructuring DuoLearnScreen's positional
 * layout (2565-line file with absolute-positioned nodes). The overlay
 * preserves the conceptual model — "tap module → see sub-units" — without
 * the layout-restructure risk. A future loop can swap this for inline
 * once the rest of the pilot is validated.
 */
export function TopicTreeOverlay({
  module,
  chapterId,
  simFirst,
  onClose,
}: TopicTreeOverlayProps): React.ReactElement {
  const router = useRouter();
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);

  const handleClose = useCallback(() => {
    tapHaptic();
    onClose();
  }, [onClose]);

  const handleTopicSelected = useCallback((topic: Topic) => {
    setActiveTopic(topic);
  }, []);

  const handlePlayerClose = useCallback(() => {
    setActiveTopic(null);
  }, []);

  const handleStartLesson = useCallback((topic: Topic) => {
    // Pilot routing: full module replay via existing /lesson/[id]. Future
    // work: per-phase entry points so a tap on "quiz" lands directly in
    // the quiz loop instead of from the start.
    setActiveTopic(null);
    onClose();
    router.push(`/lesson/${topic.moduleId}?chapterId=${chapterId}` as never);
  }, [router, chapterId, onClose]);

  return (
    <>
      <Modal
        visible
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Animated.View
          entering={SlideInDown.duration(320).springify().damping(20)}
          exiting={SlideOutDown.duration(220)}
          style={styles.overlay}
        >
          <SafeAreaView edges={['top']} style={styles.safe}>
            {/* Drag-hint header — tap to close, same affordance as a
                bottom sheet's grab-bar. */}
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="סגירה וחזרה למפת המודולות"
              style={styles.header}
              hitSlop={12}
            >
              <View style={styles.grabBar} />
              <View style={styles.headerRow}>
                <ChevronDown size={20} color="#94a3b8" strokeWidth={2.6} />
                <Text style={[styles.title, RTL]} allowFontScaling={false} numberOfLines={1}>
                  {module.title}
                </Text>
              </View>
            </Pressable>

            <View style={styles.body}>
              <TopicTreeAccordion
                module={module}
                simFirst={simFirst}
                onTopicSelected={handleTopicSelected}
              />
            </View>
          </SafeAreaView>
        </Animated.View>
      </Modal>

      {/* Nested player sheet. Rendered as a sibling Modal so it stacks
          ABOVE the overlay — iOS doesn't reliably layer two Animated
          views from the same Modal. */}
      <TopicPlayerSheet
        topic={activeTopic}
        onStartLesson={handleStartLesson}
        onClose={handlePlayerClose}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#020617',
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  grabBar: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148,163,184,0.35)',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#e0f2fe',
    flexShrink: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 12,
  },
});
