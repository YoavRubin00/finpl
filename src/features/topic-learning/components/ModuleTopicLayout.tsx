import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeInDown,
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

const NODE_SIZE = 78;
const ROW_HEIGHT = NODE_SIZE + 36; // mirrors DuoLearnScreen's outer rhythm
const WAVE_AMPLITUDE = 42;
const WAVE_PERIOD = 6;
function pathOffset(i: number): number {
  return Math.round(Math.sin((i * 2 * Math.PI) / WAVE_PERIOD) * WAVE_AMPLITUDE);
}

const COIN_LOTTIE = require('../../../../assets/lottie/wired-flat-298-coins-hover-jump.json');

interface ModuleTopicLayoutProps {
  topics: Topic[];
  isCompletedMap: Record<string, boolean>;
  recommendedTopicId?: string | null;
  progressPct: number;
  onTopicPress: (topic: Topic) => void;
}

/**
 * R5.3 (2026-06-10) — visual brought all the way in line with the
 * outer DuoLearnScreen path:
 *  - Chips cascade in with FadeInDown one after another (יפיופי vibe).
 *  - PathConnector cloned 1:1 from DuoLearnScreen (3-layer dot trail,
 *    sine interpolation, glow on completed segments).
 *  - Decorative coin Lottie between alternate nodes (R5.1).
 *  - Tree on the right edge, no halo backdrop (R5.1).
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

  const totalHeight = sorted.length * ROW_HEIGHT + 40;

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
      {/* Tree — right edge, no halo backdrop. */}
      <View style={styles.treeWrap} pointerEvents="none">
        <GrowingTree progressPct={progressPct} size={220} />
      </View>

      {/* Path column centered horizontally; sine-wave offsets fan
          chips left/right around its midline. */}
      <View style={styles.pathColumn}>
        {sorted.map((topic, i) => {
          const isRecommended = recommendedTopicId === topic.id;
          const isCompleted = Boolean(isCompletedMap[topic.id]);
          const offsetX = pathOffset(i);
          const nextOffsetX = i < sorted.length - 1 ? pathOffset(i + 1) : null;
          const showCoin = nextOffsetX !== null && i % 2 === 1;

          return (
            <Animated.View
              key={topic.id}
              // Cascading entrance — chips drop in from above one after
              // another, springy bounce on land. Yoav 2026-06-10:
              // "אנימציה מדהימה כמו קלפים שנפרסים... כמו פפסנתר".
              entering={FadeInDown.delay(60 + i * 90).duration(320).springify().damping(14)}
              style={styles.row}
            >
              {nextOffsetX !== null && (
                <PathConnector
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
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
});

/** Thin wrapper that applies the shared pulse value only when active. */
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

/**
 * Cloned from DuoLearnScreen.PathConnector (line 296) — the topic tree
 * connector must match the outer learn map character-for-character
 * per Yoav R5.3 ("שהשביל שמחבר בינהם יהיה זהה למפת הלמידה הראשית").
 *
 * Three layers: outer glow halo (done only), continuous trail fill,
 * main dots with sine-bulge sizing.
 */
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

  // Interpolate the x position along the connector relative to the LOCAL
  // path column's center. DuoLearnScreen uses CENTER_X (screen-wide) —
  // here the path column is its own coordinate space so we just blend
  // the two offsets.
  const interp = (t: number) => {
    const smooth = 0.5 - 0.5 * Math.cos(t * Math.PI);
    return fromOffsetX + (toOffsetX - fromOffsetX) * smooth;
  };

  return (
    <View pointerEvents="none" style={styles.connectorAbs}>
      {/* Outer glow halo (done only) */}
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
      {/* Continuous trail (background fill) */}
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
      {/* Main dots — sine-bulge sizing for the bow shape */}
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
    paddingVertical: 12,
  },
  treeWrap: {
    position: 'absolute',
    right: 0,
    top: 12,
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  connectorAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
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
