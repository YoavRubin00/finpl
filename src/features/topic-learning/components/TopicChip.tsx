import React, { useEffect, useRef } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { mediumHaptic, successHaptic } from '../../../utils/haptics';
import { useSoundEffect } from '../../../hooks/useSoundEffect';
import type { Topic } from '../types';

interface TopicChipProps {
  topic: Topic;
  /** Has the user completed this topic? Drives the soft-green fill —
   *  no check badge per Yoav R5.3 ("בלי וי, במקום בכחול"). */
  completed: boolean;
  /** Currently focused as the "resume here" candidate — gets a soft
   *  gold halo to direct attention without crowding the whole grid
   *  with motion. */
  recommended?: boolean;
  onPress: (topic: Topic) => void;
}

const NODE_SIZE = 78;

// R5.3 (2026-06-10): completed chips flip from chapter-blue to a soft
// pleasant green Yoav called out ("צבע ירוק בהיר ונעים בלי וי, במקום
// בכחול"). Stays muted enough to read as "done, can revisit" instead of
// "celebrate me now" — the loud celebration belongs to the chest, not
// every individual chip.
const DONE_BG = '#bbf7d0';      // green-200 — pleasant pastel
const DONE_DEPTH = '#4ade80';   // green-400 — depth shadow
const DONE_BORDER = '#22c55e';  // green-500 — thin ring for definition

// Light-gray palette for incomplete chips — matches the legacy
// ModuleNode "locked" state hue Yoav pointed to ("אפרפר לכל מה שלא
// ביצעתי עדין").
const MUTED_BG = '#e5e7eb';
const MUTED_DEPTH = '#c7cdd4';
// Incomplete chips desaturate their SVG icon a little so the bright
// gradients don't draw attention before the user has completed them.
const MUTED_ICON_OPACITY = 0.55;
// Icon visual size inside the 78px circle. Design System SVGs ship at
// 96px source; rendering at 56 leaves ~11px breathing room on each side.
const ICON_SIZE = 56;

/**
 * R5.3 (2026-06-10) — circular ModuleNode-style chip with three
 * visual changes from R5.2:
 *  1. Intro emoji switched to 👋 (no shark) at the icon registry.
 *  2. Completed state is soft green (`#bbf7d0`) instead of chapter
 *     blue, no check badge.
 *  3. Recommended halo moved INSIDE the chip (sized to the circle)
 *     so the gold glow renders as a circle on web instead of a
 *     rectangular box-shadow.
 */
export const TopicChip = React.memo(function TopicChip({
  topic,
  completed,
  recommended = false,
  onPress,
}: TopicChipProps): React.ReactElement {
  const scale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const { playSound } = useSoundEffect();

  // R8 J1 — celebrate the false→true completion transition with a
  // particle burst + green pulse + success haptic. The press itself
  // navigates away, so the "you completed it" moment fires when the
  // user returns to the map and the chip first re-renders as done.
  const prevCompletedRef = useRef(completed);
  const [burstTick, setBurstTick] = useState(0);
  useEffect(() => {
    if (!prevCompletedRef.current && completed) {
      successHaptic();
      try { playSound('btn_click_soft_3'); } catch { /* non-fatal */ }
      flashOpacity.value = withSequence(
        withTiming(0.55, { duration: 140 }),
        withTiming(0, { duration: 320 }),
      );
      scale.value = withSequence(
        withSpring(1.12, { damping: 10, stiffness: 220 }),
        withSpring(1, { damping: 11, stiffness: 200 }),
      );
      setBurstTick((t) => t + 1);
    }
    prevCompletedRef.current = completed;
  }, [completed, flashOpacity, playSound, scale]);

  const handlePress = () => {
    // R8 J1 — escalate from light tap → medium impact + soft snap sound.
    mediumHaptic();
    try { playSound('btn_click_soft_2'); } catch { /* non-fatal */ }
    flashOpacity.value = withSequence(
      withTiming(0.35, { duration: 90 }),
      withTiming(0, { duration: 220 }),
    );
    scale.value = withSpring(0.92, { damping: 14, stiffness: 260 });
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
    onPress(topic);
  };

  const bg = completed ? DONE_BG : MUTED_BG;
  const depth = completed ? DONE_DEPTH : MUTED_DEPTH;
  const border = completed ? DONE_BORDER : '#f3f4f6';

  return (
    <Animated.View style={[animStyle, styles.nodeCol]}>
      {/* Recommended gold halo — a SEPARATE circle absolute behind the
          depth + node, so the glow renders round (web's box-shadow
          inherits the parent shape, which is a rectangle here without
          this trick). */}
      {recommended && !completed && (
        <View style={styles.haloAbs} pointerEvents="none">
          <View style={styles.haloCircle} />
        </View>
      )}

      {/* R8 J1 — particle burst on the false→true completion transition.
          Keyed by burstTick so each fresh completion remounts the burst. */}
      {burstTick > 0 && (
        <View style={styles.burstAbs} pointerEvents="none" key={burstTick}>
          <ParticleBurst
            color="gold"
            particleCount={10}
            onComplete={() => { /* noop — chip stays mounted */ }}
          />
        </View>
      )}

      {/* 3D bottom depth — identical block to ModuleNode.nodeDepth */}
      <View
        style={[
          styles.nodeDepth,
          { backgroundColor: depth },
        ]}
      />
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={completed ? `${topic.titleHe} — הושלם` : topic.titleHe}
        accessibilityState={{ selected: completed }}
        hitSlop={8}
        style={[
          styles.nodeCircle,
          {
            backgroundColor: bg,
            borderColor: border,
            shadowColor: completed ? DONE_DEPTH : '#9ca3af',
          },
        ]}
      >
        <View
          style={{ opacity: completed ? 1 : MUTED_ICON_OPACITY }}
          pointerEvents="none"
        >
          <SvgXml
            xml={topic.iconAsset.svgXml}
            width={ICON_SIZE}
            height={ICON_SIZE}
          />
        </View>
        {/* R8 J1 — green flash overlay; pulses on tap AND on first
            transition to completed. Sits inside the clipped circle so
            it inherits the round mask. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.flashOverlay, flashStyle]}
        />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // The pressable circle + the depth block share this anchor, sized to
  // the NODE_SIZE square.
  nodeCol: {
    width: NODE_SIZE,
    height: NODE_SIZE + 5,
    alignItems: 'center',
  },
  // Sits 5px below the circle to create the 3D recess — exact mirror of
  // DuoLearnScreen.styles.nodeDepth.
  nodeDepth: {
    width: NODE_SIZE,
    height: NODE_SIZE + 5,
    borderRadius: NODE_SIZE / 2,
    position: 'absolute',
    top: 5,
  },
  // Same border + shadow profile as DuoLearnScreen.styles.nodeCircle.
  nodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  // Absolute layer for the recommended halo so the glow renders behind
  // both the depth block and the circle.
  haloAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  // Round shape ensures box-shadow on web inherits a circle, not a rect.
  haloCircle: {
    width: NODE_SIZE + 18,
    height: NODE_SIZE + 18,
    borderRadius: (NODE_SIZE + 18) / 2,
    shadowColor: '#fbbf24',
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  // R8 J1 — particle burst layer; positioned over the chip center.
  burstAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  // R8 J1 — bright green flash overlay, inside the circle clip mask.
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#86efac',
    borderRadius: NODE_SIZE / 2,
  },
});
