import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';
import { tapHaptic } from '../../../utils/haptics';
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
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    tapHaptic();
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
});
