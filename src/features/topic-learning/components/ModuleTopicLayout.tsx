import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TopicChip } from './TopicChip';
import type { Topic } from '../types';

const SCREEN_W = Dimensions.get('window').width;

const NODE_SIZE = 78;
const ROW_HEIGHT = NODE_SIZE + 36;
const WAVE_AMPLITUDE = 42;
const WAVE_PERIOD = 6;
// Vertical gap rendered above the first chip and below the last chip.
// We fill it with a PathConnector so the trail visually continues from
// the outer mod-1-1 node down INTO the chip column, and from the last
// chip OUT to the next pearl. Sized so the dot density matches the
// inter-chip connectors (Yoav R5.9 2026-06-10: "הסוף לא מתחבר טוב
// לפנינה / הכותרת של המודולה לא מתחברת טוב לאינטרו").
const EDGE_CONNECTOR_H = 56;
function pathOffset(i: number): number {
  return Math.round(Math.sin((i * 2 * Math.PI) / WAVE_PERIOD) * WAVE_AMPLITUDE);
}


interface ModuleTopicLayoutProps {
  topics: Topic[];
  isCompletedMap: Record<string, boolean>;
  recommendedTopicId?: string | null;
  /** Retained for API stability — the GrowingTree it used to drive was
   *  retired in R5.10 per Yoav ("תוריד בבקשה את העץ, הוא לא מתאים"). */
  progressPct?: number;
  onTopicPress: (topic: Topic) => void;
}

/**
 * R5.9 (2026-06-10) — restore entry/exit connectors:
 *  - Entry PathConnector fills the gap above the first chip so the
 *    outer mod-1-1 gold trail visually continues INTO the chip column
 *    rather than dead-ending in whitespace.
 *  - Exit PathConnector fills the gap below the last chip so the
 *    column hands off cleanly to the next pearl's trail. Both are
 *    rendered in the same dotted style as the inter-chip connectors
 *    so the entire surface reads as one continuous path.
 *
 * Earlier (R5.4 → R5.8): entry/exit oscillated between white-dotted,
 * coin column, and nothing. None looked right. The cause was
 * underestimating how visible the gap is on first paint — the outer
 * DuoLearnScreen trail terminates at mod-1-1's bottom edge and only
 * resumes BELOW the accordion content; the accordion needs to draw
 * its own connector across that span.
 */
export const ModuleTopicLayout = React.memo(function ModuleTopicLayout({
  topics,
  isCompletedMap,
  onTopicPress,
}: ModuleTopicLayoutProps): React.ReactElement {
  const sorted = useMemo(
    () => [...topics].sort((a, b) => a.defaultOrder - b.defaultOrder),
    [topics],
  );

  // Height = entry connector + n chip rows + exit connector.
  const totalHeight = EDGE_CONNECTOR_H + sorted.length * ROW_HEIGHT + EDGE_CONNECTOR_H;
  const firstCompleted = sorted.length > 0 && Boolean(isCompletedMap[sorted[0].id]);
  const lastCompleted =
    sorted.length > 0 && Boolean(isCompletedMap[sorted[sorted.length - 1].id]);

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      {/* Entry connector — from outer mod-1-1 node into the chip column. */}
      <View style={[styles.entryConnectorSlot, { height: EDGE_CONNECTOR_H }]} pointerEvents="none">
        <PathConnector
          fromOffsetX={0}
          toOffsetX={sorted.length > 0 ? pathOffset(0) : 0}
          done={firstCompleted}
          height={EDGE_CONNECTOR_H}
        />
      </View>

      {/* Path column centered horizontally; sine-wave offsets fan
          chips left/right around its midline. */}
      <View style={[styles.pathColumn, { marginTop: EDGE_CONNECTOR_H }]}>
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
                    height={ROW_HEIGHT}
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

      {/* Exit connector — from last chip out to the next pearl below. */}
      <View style={[styles.exitConnectorSlot, { height: EDGE_CONNECTOR_H }]} pointerEvents="none">
        <PathConnector
          fromOffsetX={sorted.length > 0 ? pathOffset(sorted.length - 1) : 0}
          toOffsetX={0}
          done={lastCompleted}
          height={EDGE_CONNECTOR_H}
        />
      </View>
    </View>
  );
});

/** Cloned from DuoLearnScreen.PathConnector (line 296). */
function PathConnector({
  fromOffsetX,
  toOffsetX,
  done,
  height,
}: {
  fromOffsetX: number;
  toOffsetX: number;
  done: boolean;
  height: number;
}): React.ReactElement {
  const NUM_DOTS = 16;
  const CONNECTOR_H = height;
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
  },
  entryConnectorSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  exitConnectorSlot: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
