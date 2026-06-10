import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GrowingTree } from './GrowingTree';
import { TopicChip } from './TopicChip';
import type { Topic } from '../types';

const SCREEN_W = Dimensions.get('window').width;

const NODE_SIZE = 78;
const ROW_HEIGHT = NODE_SIZE + 36;
const WAVE_AMPLITUDE = 42;
const WAVE_PERIOD = 6;
function pathOffset(i: number): number {
  return Math.round(Math.sin((i * 2 * Math.PI) / WAVE_PERIOD) * WAVE_AMPLITUDE);
}


interface ModuleTopicLayoutProps {
  topics: Topic[];
  isCompletedMap: Record<string, boolean>;
  recommendedTopicId?: string | null;
  progressPct: number;
  onTopicPress: (topic: Topic) => void;
}

/**
 * R5.4 (2026-06-10) — final polish pass:
 *  - Entry & exit connectors render OUTSIDE the row stack so the path
 *    visually attaches to the outer mod-1-1 node above and the pearl
 *    below (Yoav: "שהתת מודולה הראשונה תתחבר לריבית דריבית,
 *    ושהאחרונה תתחבר לפנינה שאחריה").
 *  - Inter-chip connectors offset down by NODE_SIZE/2 so the trail
 *    exits the CENTER of each chip instead of grazing its bottom
 *    ("שהחיבור יצא ממרז הכפתור").
 *  - Tree compressed to 140px in the top-right corner so it never
 *    overlaps a chip ("שהעץ לא יעלה על הכפתורי הפעלה").
 *  - Recommended halo retired — Yoav called it visual noise ("שההבא
 *    שצריך לעשות לא יהיה זוהר"). The "next up" chip just renders as
 *    any other incomplete chip.
 */
export const ModuleTopicLayout = React.memo(function ModuleTopicLayout({
  topics,
  isCompletedMap,
  progressPct,
  onTopicPress,
}: ModuleTopicLayoutProps): React.ReactElement {
  const sorted = useMemo(
    () => [...topics].sort((a, b) => a.defaultOrder - b.defaultOrder),
    [topics],
  );

  // Tight reserve at the top (just 12px) so the first chip sits as
  // close as possible to the outer mod-1-1 node above (Yoav R5.5:
  // "תקטין את המרחק בין הריבית דריבית לתת הראשונה"). Bottom keeps
  // half a row for the exit connector reaching down to the pearl.
  const totalHeight = sorted.length * ROW_HEIGHT + 12;

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      {/* Tree — small + tucked in the top-right corner so it never
          eats a chip slot. */}
      <View style={styles.treeWrap} pointerEvents="none">
        <GrowingTree progressPct={progressPct} size={100} />
      </View>

      {/* Path column centered horizontally; sine-wave offsets fan
          chips left/right around its midline. */}
      <View style={styles.pathColumn}>
        {sorted.map((topic, i) => {
          const isCompleted = Boolean(isCompletedMap[topic.id]);
          const offsetX = pathOffset(i);
          const nextOffsetX = i < sorted.length - 1 ? pathOffset(i + 1) : null;

          return (
            <Animated.View
              key={topic.id}
              entering={FadeInDown.delay(60 + i * 90).duration(320).springify().damping(14)}
              style={styles.row}
            >
              {/* Dotted PathConnector — identical to outer DuoLearnScreen
                  trail, so the topic-tree's chip-to-chip path reads as
                  the same surface as the outer module-to-module path
                  (Yoav R5.8: "השביל מטבעות... לא אחיד כמו שאר המפת
                  למידה"). */}
              {nextOffsetX !== null && (
                <View style={styles.midConnectorSlot} pointerEvents="none">
                  <PathConnector
                    fromOffsetX={offsetX}
                    toOffsetX={nextOffsetX}
                    done={isCompleted}
                  />
                </View>
              )}
              <View style={[styles.nodeSlot, { transform: [{ translateX: offsetX }] }]}>
                <TopicChip
                  topic={topic}
                  completed={isCompleted}
                  recommended={false}
                  onPress={onTopicPress}
                />
              </View>
            </Animated.View>
          );
        })}
      </View>

    </View>
  );
});

/** Cloned from DuoLearnScreen.PathConnector (line 296). */
function PathConnector({
  fromOffsetX,
  toOffsetX,
  done,
}: {
  fromOffsetX: number;
  toOffsetX: number;
  done: boolean;
}): React.ReactElement {
  const NUM_DOTS = 16;
  const CONNECTOR_H = ROW_HEIGHT;
  const dotColor = done ? '#f59e0b' : '#d1d5db';
  const trailColor = done ? '#fde68a' : '#e5e7eb';
  const glowColor = '#fde68a';

  const interp = (t: number) => {
    const smooth = 0.5 - 0.5 * Math.cos(t * Math.PI);
    return fromOffsetX + (toOffsetX - fromOffsetX) * smooth;
  };

  return (
    <View pointerEvents="none" style={styles.connectorAbs}>
      {done && Array.from({ length: 60 }).map((_, i) => {
        const t = i / 59;
        const cx = interp(t);
        const cy = t * CONNECTOR_H;
        return (
          <View
            key={`glow-${i}`}
            style={{
              position: 'absolute',
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: glowColor,
              left: '50%',
              marginLeft: cx - 7,
              top: cy,
              opacity: 0.18,
            }}
          />
        );
      })}
      {Array.from({ length: NUM_DOTS * 3 }).map((_, i) => {
        const t = i / (NUM_DOTS * 3 - 1);
        const cx = interp(t);
        const cy = t * CONNECTOR_H;
        const sz = done ? 10 : 6;
        return (
          <View
            key={`trail-${i}`}
            style={{
              position: 'absolute',
              width: sz,
              height: sz,
              borderRadius: sz / 2,
              backgroundColor: trailColor,
              left: '50%',
              marginLeft: cx - sz / 2,
              top: cy,
              opacity: done ? 0.5 : 0.25,
            }}
          />
        );
      })}
      {Array.from({ length: NUM_DOTS }).map((_, i) => {
        const t = i / (NUM_DOTS - 1);
        const cx = interp(t);
        const cy = t * (CONNECTOR_H - 4);
        const dotSize = done
          ? 10 + Math.sin(t * Math.PI) * 3
          : 7 + Math.sin(t * Math.PI) * 2;
        return (
          <View
            key={`dot-${i}`}
            style={{
              position: 'absolute',
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: dotColor,
              left: '50%',
              marginLeft: cx - dotSize / 2,
              top: cy,
              opacity: done ? 1 : 0.55,
              ...(done && {
                borderWidth: 1.5,
                borderColor: '#fffbeb',
                shadowColor: '#f59e0b',
                shadowOpacity: 0.6,
                shadowRadius: 4,
                elevation: 3,
              }),
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: ROW_HEIGHT / 2 + 8,
    paddingBottom: ROW_HEIGHT / 2,
  },
  // Tree only in the top-right corner — never crosses below the first
  // chip row, so it can't overlap any button.
  treeWrap: {
    position: 'absolute',
    right: 4,
    top: -10,
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  pathColumn: {
    width: Math.min(SCREEN_W * 0.5, 220),
    alignSelf: 'center',
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
    zIndex: 5,
  },
  connectorAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Pull the inter-chip connector down so it emerges from the chip's
  // vertical center (NODE_SIZE/2 below the row top, which is where the
  // chip sits centered).
  midConnectorSlot: {
    position: 'absolute',
    top: NODE_SIZE / 2,
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
  },
});
