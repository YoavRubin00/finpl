import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { GrowingTree } from './GrowingTree';
import { TopicChip } from './TopicChip';
import type { Topic } from '../types';

interface ModuleTopicLayoutProps {
  topics: Topic[];
  isCompletedMap: Record<string, boolean>;
  /** Chip the "Resume" CTA points at — highlights with a halo. */
  recommendedTopicId?: string | null;
  /** 0-100 for tree growth. */
  progressPct: number;
  onTopicPress: (topic: Topic) => void;
}

const CONTAINER_HEIGHT = 320;
const TREE_SIZE = 220;
// Radius governs how far chips sit from the tree's center. Picked so chips
// don't overlap the tree visually while staying inside the container.
const CHIP_RADIUS_X = 130;
const CHIP_RADIUS_Y = 122;

/**
 * Orbital layout — tree at the visual center, topic chips ringed around
 * it like satellites. Placement is computed once per topic count so it's
 * stable across renders (chips don't shuffle when one flips to completed).
 *
 * The orbit is intentionally NOT a perfect circle — chips are squished
 * vertically (RADIUS_Y < RADIUS_X) so the layout reads as a "round shrub
 * canopy" rather than a circle, and so 8-10 chips don't crowd the bottom
 * where the watering can sits in the tree art.
 */
export const ModuleTopicLayout = React.memo(function ModuleTopicLayout({
  topics,
  isCompletedMap,
  recommendedTopicId,
  progressPct,
  onTopicPress,
}: ModuleTopicLayoutProps): React.ReactElement {
  // Sort by defaultOrder so chip positions are predictable across remounts.
  const sorted = useMemo(
    () => [...topics].sort((a, b) => a.defaultOrder - b.defaultOrder),
    [topics],
  );

  const positions = useMemo(() => {
    const n = sorted.length;
    if (n === 0) return [] as Array<{ x: number; y: number }>;
    // Start at top (12 o'clock) and walk clockwise. -π/2 puts the first
    // chip at the top of the orbit; positive angle step rotates clockwise
    // when y is downward (RN coord system).
    const start = -Math.PI / 2;
    const step = (2 * Math.PI) / n;
    return sorted.map((_, i) => {
      const a = start + i * step;
      return {
        x: Math.cos(a) * CHIP_RADIUS_X,
        y: Math.sin(a) * CHIP_RADIUS_Y,
      };
    });
  }, [sorted]);

  return (
    <View style={styles.container}>
      {/* Tree at the geometric center of the container. */}
      <View style={styles.treeWrap} pointerEvents="none">
        <GrowingTree progressPct={progressPct} size={TREE_SIZE} />
      </View>

      {sorted.map((topic, i) => {
        const pos = positions[i];
        return (
          <View
            key={topic.id}
            style={[
              styles.chipSlot,
              { transform: [{ translateX: pos.x }, { translateY: pos.y }] },
            ]}
          >
            <TopicChip
              topic={topic}
              completed={Boolean(isCompletedMap[topic.id])}
              recommended={recommendedTopicId === topic.id}
              onPress={onTopicPress}
            />
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: CONTAINER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    // The chipSlot translateX/Y are relative to this center anchor.
    position: 'relative',
  },
  treeWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
