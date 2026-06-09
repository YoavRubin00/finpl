import React, { useRef } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { Check } from 'lucide-react-native';
import { tapHaptic } from '../../../utils/haptics';
import type { Topic, TopicTileSpec, TopicLottieSpec } from '../types';

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
 * R5 (2026-06-10) — flat pastel tile + Lucide icon design. Matches
 * Yoav's reference screenshot of colored category badges. Intro
 * remains a Lottie shark (special-cased) per "רק האינטרו של שארק".
 *
 * Completed state: green check badge on a corner, gold ring around the
 * tile, slight gold tint baked into the bg. Recommended state: subtle
 * outer halo so the next-up node grabs the eye without animating the
 * whole grid.
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
    scale.value = withSpring(0.92, { damping: 14, stiffness: 260 });
    scale.value = withSpring(1, { damping: 12, stiffness: 220 });
    onPress(topic);
  };

  const asset = topic.iconAsset;
  const isLottie = asset.type === 'lottie';
  const tile = isLottie ? null : (asset as TopicTileSpec);
  const IconComp = tile?.icon;

  // Bg color: tile spec for tiles, white for lottie chips so the
  // Captain Shark animation pops without a colored background.
  const tileBg = isLottie ? '#ffffff' : tile!.bg;
  const ringColor = completed ? '#f59e0b' : isLottie ? '#bfdbfe' : tile!.fg;

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
          {
            backgroundColor: tileBg,
            borderColor: ringColor,
            shadowColor: ringColor,
          },
          completed ? styles.chipCompleted : null,
        ]}
      >
        <View style={styles.iconWrap}>
          {isLottie ? (
            <LottieView
              ref={lottieRef}
              source={(asset as TopicLottieSpec).asset}
              autoPlay
              loop={!completed}
              style={styles.lottieIcon}
            />
          ) : (
            IconComp && (
              <IconComp
                size={36}
                color={tile!.fg}
                strokeWidth={2.4}
              />
            )
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
    borderRadius: 22, // softly rounded square — matches the reference tiles
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOpacity: 0.30,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  chipCompleted: {
    borderWidth: 3,
    shadowOpacity: 0.45,
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
  lottieIcon: {
    width: 56,
    height: 56,
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
