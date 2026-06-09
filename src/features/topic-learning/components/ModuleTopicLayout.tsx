import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { GrowingTree } from './GrowingTree';
import { TopicChip } from './TopicChip';
import type { Topic } from '../types';

const SCREEN_W = Dimensions.get('window').width;

/** Same sine-wave math as DuoLearnScreen.getNodeOffset so the inner
 *  topic path reads as a continuation of the outer module path —
 *  visual code-share, not just visual rhyme. */
const NODE_SIZE = 76;
const ROW_HEIGHT = NODE_SIZE + 30;
const WAVE_AMPLITUDE = 42; // same as the outer DuoLearnScreen path
const WAVE_PERIOD = 6;
function pathOffset(i: number): number {
  return Math.round(Math.sin((i * 2 * Math.PI) / WAVE_PERIOD) * WAVE_AMPLITUDE);
}

// Bouncing-coin Lottie reused from DuoLearnScreen's easter-egg drop —
// here it doubles as decorative path candy, lit between every other
// node so the path feels alive without crowding the layout.
const COIN_LOTTIE = require('../../../../assets/lottie/wired-flat-298-coins-hover-jump.json');

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
 * R5.1 (2026-06-10) — path centered horizontally in the container,
 * tree to the right WITHOUT a halo backdrop, decorative coins on the
 * path between alternate nodes. Mirrors the outer DuoLearnScreen
 * visual language one-for-one ("החווית משתמש של הלמידה צריכה להיות
 * כמו של המסך הכללי").
 */
export const ModuleTopicLayout = React.memo(function ModuleTopicLayout({
  topics,
  isCompletedMap,
  recommendedTopicId,
  progressPct,
  onTopicPress,
}: ModuleTopicLayoutProps): React.ReactElement {
  const sorted = useMemo(
    () => [...topics].sort((a, b) => a.defaultOrder - b.defaultOrder),
    [topics],
  );

  const totalHeight = sorted.length * ROW_HEIGHT + 20;

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

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      {/* Tree — no halo backdrop per Yoav R5.1, just the tree itself,
          floating on the right edge of the column. */}
      <View style={styles.treeWrap} pointerEvents="none">
        <GrowingTree progressPct={progressPct} size={220} />
      </View>

      {/* Path column, centered horizontally inside the container. The
          sine-wave offsets shift chips left/right around the center. */}
      <View style={styles.pathColumn}>
        {sorted.map((topic, i) => {
          const isRecommended = recommendedTopicId === topic.id;
          const isCompleted = Boolean(isCompletedMap[topic.id]);
          const offsetX = pathOffset(i);
          const nextOffsetX = i < sorted.length - 1 ? pathOffset(i + 1) : null;
          // Decorate every other gap with a bouncing coin Lottie —
          // matches the outer learn map's "path candy" rhythm.
          const showCoin = nextOffsetX !== null && i % 2 === 1;

          return (
            <View key={topic.id} style={styles.row}>
              {nextOffsetX !== null && (
                <Connector
                  fromOffsetX={offsetX}
                  toOffsetX={nextOffsetX}
                  done={isCompleted}
                />
              )}
              {showCoin && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.coinSlot,
                    {
                      // Sit halfway between this node and the next,
                      // offset to the OPPOSITE side of the path so it
                      // doesn't visually collide with the chip.
                      left: '50%',
                      marginLeft: ((offsetX + nextOffsetX) / 2) - 14,
                      top: ROW_HEIGHT / 2 + 8,
                    },
                  ]}
                >
                  <LottieView source={COIN_LOTTIE} autoPlay loop style={styles.coin} />
                </View>
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

/** Plain dotted-line connector between two horizontally-offset nodes. */
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
              left: d.x,
              top: d.y,
              backgroundColor: done ? '#f59e0b' : 'rgba(147, 197, 253, 0.75)',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12,
  },
  // Tree floats on the right edge of the layout. No background halo
  // (Yoav R5.1: "שלא יהיה רקע להעץ").
  treeWrap: {
    position: 'absolute',
    right: 0,
    top: 12,
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Path column centered horizontally inside the container. Width is
  // capped so chips don't spread too wide on tablets/web; the sine
  // offsets play around this center.
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
  },
  connectorAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Decorative coin between alternating nodes — same Lottie + sizing
  // as DuoLearnScreen's easter-egg coin so the surfaces feel related.
  coinSlot: {
    position: 'absolute',
    width: 28,
    height: 28,
  },
  coin: {
    width: 28,
    height: 28,
  },
});
