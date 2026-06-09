import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import type { Topic } from '../types';

interface TopicChipProps {
  topic: Topic;
  /** Has the user completed this topic? Drives the chapter-blue fill
   *  + gold check badge. Incomplete chips read as muted/gray. */
  completed: boolean;
  /** Currently focused as the "resume here" candidate — gets a soft
   *  pulse to direct attention without crowding the whole grid with
   *  motion. */
  recommended?: boolean;
  onPress: (topic: Topic) => void;
}

const NODE_SIZE = 78;

// Chapter-1 palette pulled from DuoLearnScreen's ARENA_COLORS[1].
// Hardcoded here because the pilot is mod-1-1-only and the chip layer
// shouldn't reach across the codebase for a single integer lookup.
const CHAPTER_BG = '#3b82f6';     // arena[1].bg
const CHAPTER_DEPTH = '#1e40af';  // arena[1].bottom

// Light-gray palette for incomplete chips — matches the legacy ModuleNode
// "locked" state hue Yoav pointed to ("אפרפר לכל מה שלא ביצעתי עדין").
const MUTED_BG = '#e5e7eb';
const MUTED_DEPTH = '#c7cdd4';
const MUTED_EMOJI_OPACITY = 0.55;

/**
 * R5.2 (2026-06-10) — circular ModuleNode-style chip. Identical visual
 * skeleton to DuoLearnScreen's outer ModuleNode (78px circle + 3D
 * depth shadow behind + white border + emoji centered at 28px).
 *
 * Two color states:
 *  - completed → chapter-1 blue (#3b82f6) on darker depth (#1e40af),
 *    full-opacity emoji, gold check badge top-left
 *  - incomplete → muted gray on darker gray depth, dim emoji
 *
 * Recommended ("resume here") adds an outer halo pulse via the
 * surrounding PulseHalo wrapper — handled by the parent layout, not
 * the chip itself.
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

  const bg = completed ? CHAPTER_BG : MUTED_BG;
  const depth = completed ? CHAPTER_DEPTH : MUTED_DEPTH;

  return (
    <Animated.View style={[animStyle, recommended ? styles.recommendedHalo : null, styles.nodeCol]}>
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
            borderColor: completed ? '#ffffff' : '#f3f4f6',
            shadowColor: completed ? CHAPTER_BG : '#9ca3af',
          },
        ]}
      >
        <Text
          style={[styles.nodeIcon, { opacity: completed ? 1 : MUTED_EMOJI_OPACITY }]}
          accessible={false}
        >
          {topic.iconAsset.emoji}
        </Text>
      </Pressable>
      {completed && (
        <View style={styles.checkBadge} pointerEvents="none">
          <Check size={12} color="#ffffff" strokeWidth={3.2} />
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // The pressable circle + the depth block + the optional check badge
  // share this anchor, sized to the NODE_SIZE square.
  nodeCol: {
    width: NODE_SIZE,
    height: NODE_SIZE + 5, // depth block adds 5px below
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
  nodeIcon: {
    fontSize: 32,
    textAlign: 'center',
    includeFontPadding: false,
  },
  recommendedHalo: {
    shadowColor: '#fbbf24',
    shadowOpacity: 0.95,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 6,
  },
});
