import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { GrowingTree } from './GrowingTree';
import { TopicChip } from './TopicChip';
import type { Topic } from '../types';

const SCREEN_W = Dimensions.get('window').width;

/** Same sine-wave math as DuoLearnScreen.getNodeOffset so the inner
 *  topic path reads as a continuation of the outer module path —
 *  visual code-share, not just visual rhyme. Amplitude tightened to
 *  the narrower accordion width. */
const NODE_SIZE = 76;
const ROW_HEIGHT = NODE_SIZE + 30;
const WAVE_AMPLITUDE = 36;
const WAVE_PERIOD = 6;
function pathOffset(i: number): number {
  return Math.round(Math.sin((i * 2 * Math.PI) / WAVE_PERIOD) * WAVE_AMPLITUDE);
}

interface ModuleTopicLayoutProps {
  topics: Topic[];
  isCompletedMap: Record<string, boolean>;
  /** Chip the "Resume" CTA points at — gets a "JUMP HERE" pulse halo. */
  recommendedTopicId?: string | null;
  /** 0-100 for tree growth. */
  progressPct: number;
  onTopicPress: (topic: Topic) => void;
}

/**
 * Duolingo-style vertical learning path: topic nodes stacked in a
 * sine-wave column, dotted connectors between them, the gold tree
 * floating to the right as a "watch your progress" centerpiece.
 *
 * Replaces the earlier orbital ring (Yoav 2026-06-09: "אני רוצה שיהיה
 * בסגנון הזה, ולא בצורת עיגול, אלא מפת למידה" + "שהעץ יהיה מימין
 * לשביל"). Reuses DuoLearnScreen's getNodeOffset math so the inner
 * path of mod-1-1's sub-units feels like a zoom-in of the outer
 * module path.
 *
 * Design references: Duolingo v2 dark learn map (Section/Unit) — see
 * docs/MEMORY references. יפיופי: decision-point per node (Supercell
 * 30-90s rule). דואו: Duolingo Section nodes are circular ~80px, with
 * an active-node pulse + "START HERE" floating label.
 */
export const ModuleTopicLayout = React.memo(function ModuleTopicLayout({
  topics,
  isCompletedMap,
  recommendedTopicId,
  progressPct,
  onTopicPress,
}: ModuleTopicLayoutProps): React.ReactElement {
  // Sort by defaultOrder so node positions stay stable across rerenders.
  const sorted = useMemo(
    () => [...topics].sort((a, b) => a.defaultOrder - b.defaultOrder),
    [topics],
  );

  const totalHeight = sorted.length * ROW_HEIGHT + 20;

  // Subtle pulse on the recommended node — drives a halo scale through
  // the TopicChip's `recommended` prop. Single shared value at the
  // layout level (vs. one per chip) keeps it cheap.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800 }),
        withTiming(1.0, { duration: 800 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  // Layout: row contains the path on the left half + the tree on the
  // right half. The tree is positioned absolute so it doesn't push
  // the path nodes around; it sits in the column's negative space.
  return (
    <View style={[styles.container, { height: totalHeight }]}>
      {/* Tree — absolute on the right, vertically centered to the path */}
      <View style={styles.treeWrap} pointerEvents="none">
        <GrowingTree progressPct={progressPct} size={160} />
      </View>

      {/* Path nodes */}
      <View style={styles.pathColumn}>
        {sorted.map((topic, i) => {
          const isRecommended = recommendedTopicId === topic.id;
          const isCompleted = Boolean(isCompletedMap[topic.id]);
          const offsetX = pathOffset(i);
          const nextOffsetX = i < sorted.length - 1 ? pathOffset(i + 1) : null;

          return (
            <View key={topic.id} style={styles.row}>
              {/* Dotted connector to the next node, drawn between this
                  node and the next. Skipped on the last node. */}
              {nextOffsetX !== null && (
                <Connector
                  fromOffsetX={offsetX}
                  toOffsetX={nextOffsetX}
                  done={isCompleted}
                />
              )}
              <View style={[styles.nodeSlot, { transform: [{ translateX: offsetX }] }]}>
                <PulseHalo active={isRecommended && !isCompleted} pulse={pulse}>
                  <TopicChip
                    topic={topic}
                    completed={isCompleted}
                    recommended={isRecommended && !isCompleted}
                    onPress={onTopicPress}
                  />
                </PulseHalo>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

/** Thin wrapper that applies the shared pulse value only when active.
 *  Inert when not — no needless re-renders. */
function PulseHalo({
  active,
  pulse,
  children,
}: {
  active: boolean;
  pulse: ReturnType<typeof useSharedValue<number>>;
  children: React.ReactNode;
}): React.ReactElement {
  const style = useAnimatedStyle(() => ({
    transform: active ? [{ scale: pulse.value }] : [],
  }));
  if (!active) return <>{children}</>;
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Plain dotted-line connector between two horizontally-offset nodes.
 *  Mirrors the visual feel of DuoLearnScreen's PathConnector without
 *  importing it (no need for the gold-trail behavior here). */
function Connector({
  fromOffsetX,
  toOffsetX,
  done,
}: {
  fromOffsetX: number;
  toOffsetX: number;
  done: boolean;
}): React.ReactElement {
  const dots = useMemo(() => {
    const out: Array<{ x: number; y: number }> = [];
    for (let t = 0; t <= 1; t += 1 / 5) {
      out.push({
        x: fromOffsetX + (toOffsetX - fromOffsetX) * t,
        y: (NODE_SIZE / 2) + (ROW_HEIGHT - NODE_SIZE / 2) * t,
      });
    }
    return out;
  }, [fromOffsetX, toOffsetX]);

  return (
    <View pointerEvents="none" style={styles.connectorAbs}>
      {dots.map((d, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              transform: [{ translateX: d.x }, { translateY: d.y }],
              backgroundColor: done ? '#f59e0b' : 'rgba(125, 211, 252, 0.55)',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    position: 'relative',
  },
  treeWrap: {
    position: 'absolute',
    right: 0,
    top: 24,
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The path occupies the LEFT half. SCREEN_W * 0.45 keeps it clear of
  // the tree on the right side of the accordion.
  pathColumn: {
    width: Math.min(SCREEN_W * 0.45, 200),
    alignSelf: 'flex-start',
  },
  row: {
    height: ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nodeSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
