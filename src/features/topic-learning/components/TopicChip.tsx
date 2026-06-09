import React, { useRef } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import { Check } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import type { Topic } from '../types';

interface TopicChipProps {
  topic: Topic;
  /** Has the user completed this topic? Drives glow + checkmark badge. */
  completed: boolean;
  /** Currently focused as the "resume here" candidate — gets a soft pulse
   *  to direct attention without crowding the whole tree with motion. */
  recommended?: boolean;
  onPress: (topic: Topic) => void;
}

/** Native `require()` returns a number for bundler-resolved static
 *  assets (PNG/WebP) and the parsed JSON object for Lottie files. The
 *  numeric branch routes to expo-image; the object branch to LottieView. */
function isImageAsset(asset: Topic['iconAsset']): asset is number {
  return typeof asset === 'number';
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
          {isImageAsset(topic.iconAsset) ? (
            <ExpoImage
              source={topic.iconAsset}
              style={styles.icon}
              contentFit="contain"
              accessible={false}
            />
          ) : (
            <LottieView
              ref={lottieRef}
              source={topic.iconAsset as AnimationObject}
              autoPlay
              loop={!completed}
              // When completed, freeze on the last frame so the chip reads
              // "done" rather than still-inviting.
              style={styles.icon}
            />
          )}
        </View>
        {completed && (
          <View style={styles.checkBadge} pointerEvents="none">
            <Check size={12} color="#ffffff" strokeWidth={3.2} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2, // round to match Duolingo path nodes
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  chipIdle: {
    borderColor: '#38bdf8', // sky-400, pops on dark bg
    backgroundColor: '#0f2a4d', // dark slate so the white icon pops
  },
  chipCompleted: {
    borderColor: '#f59e0b', // gold ring
    shadowColor: '#f59e0b',
    backgroundColor: '#78350f', // deep amber on dark bg
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
});
