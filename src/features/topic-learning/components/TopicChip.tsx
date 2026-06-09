import React, { useRef } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import { Check } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import type { Topic } from '../types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface TopicChipProps {
  topic: Topic;
  /** Has the user completed this topic? Drives glow + checkmark badge. */
  completed: boolean;
  /** Currently focused as the "resume here" candidate — gets a soft pulse
   *  to direct attention without crowding the whole tree with motion. */
  recommended?: boolean;
  onPress: (topic: Topic) => void;
}

const CHIP_SIZE = 76;

/**
 * Octagonal-flavored chip that hosts one Lottie icon. The CSS "octagon"
 * effect is approximated with a high border-radius square — full SVG path
 * clipping would be ideal but pulls a third-party Skia/SVG dep that this
 * pilot doesn't yet need. Visual landing zone with completed/normal/dim
 * variants matches the spec in plan §2.2.
 */
export const TopicChip = React.memo(function TopicChip({
  topic,
  completed,
  recommended = false,
  onPress,
}: TopicChipProps): React.ReactElement {
  const scale = useSharedValue(1);
  const lottieRef = useRef<LottieView>(null);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    tapHaptic();
    // Spring press-snap mirrors the SupercellButton feel used elsewhere
    // in the app for chip-style press feedback.
    scale.value = withSpring(0.92, { damping: 14, stiffness: 260 });
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
    onPress(topic);
  };

  return (
    <Animated.View style={[animStyle, recommended ? styles.recommendedHalo : null]}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={completed ? `${topic.titleHe} — הושלם` : topic.titleHe}
        accessibilityState={{ selected: completed }}
        hitSlop={8}
        style={[
          styles.chip,
          completed ? styles.chipCompleted : styles.chipIdle,
        ]}
      >
        <View style={styles.iconWrap}>
          <LottieView
            ref={lottieRef}
            // iconAsset is typed as bitmap-require OR AnimationObject; the
            // Lottie pilot only ships the AnimationObject path, so cast
            // here. When/if PNG topics ship, swap to a branched renderer.
            source={topic.iconAsset as AnimationObject}
            autoPlay
            loop={!completed}
            // When completed, freeze on the last frame so the chip reads
            // "done" rather than still-inviting.
            style={styles.icon}
          />
        </View>
        {completed && (
          <View style={styles.checkBadge} pointerEvents="none">
            <Check size={12} color="#ffffff" strokeWidth={3.2} />
          </View>
        )}
      </Pressable>
      <Text style={[styles.label, RTL]} numberOfLines={1} allowFontScaling={false}>
        {topic.titleHe}
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 22, // octagon-ish, less sharp than a square
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    backgroundColor: '#ffffff',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  chipIdle: {
    borderColor: '#7dd3fc', // sky-300
  },
  chipCompleted: {
    borderColor: '#f59e0b', // gold ring
    shadowColor: '#f59e0b',
    backgroundColor: '#fef3c7', // light gold tint
  },
  recommendedHalo: {
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.95,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 48,
    height: 48,
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
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0c4a6e',
    marginTop: 6,
    width: CHIP_SIZE + 14,
  },
});
