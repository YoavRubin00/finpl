import { useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mediumHaptic, successHaptic, errorHaptic } from '../../utils/haptics';
import {
  DAISY_HAPPY_CELEBRATE_WEBP,
  DAISY_EMPATHIC_WEBP,
} from '../podcast-segment/daisy-assets';
import type {
  CoupleDilemmaOption,
  CoupleDilemmaSegment,
} from '../chapter-1-content/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Props {
  dilemma: CoupleDilemmaSegment;
  /** Fired once a swipe past threshold completes. */
  onChoose: (option: CoupleDilemmaOption) => void;
}

/**
 * Tinder-style swipe card overlaid on the paused video.
 *
 * Right swipe → optionA, left swipe → optionB.
 * The card itself is semi-transparent so the frozen video still shows through.
 * Side hints make the two options visible without taking over the screen.
 */
export function CoupleDilemmaSwipeCard({ dilemma, onChoose }: Props) {
  const insets = useSafeAreaInsets();
  const translateX = useSharedValue(0);
  const swiped = useSharedValue(false);

  const finalizeChoice = useCallback(
    (option: CoupleDilemmaOption) => {
      if (option.isWise) successHaptic();
      else errorHaptic();
      onChoose(option);
    },
    [onChoose],
  );

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      if (swiped.value) return;
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (swiped.value) return;
      if (e.translationX > SWIPE_THRESHOLD) {
        swiped.value = true;
        translateX.value = withTiming(SCREEN_WIDTH * 1.2, { duration: 280 });
        runOnJS(mediumHaptic)();
        runOnJS(finalizeChoice)(dilemma.optionA);
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        swiped.value = true;
        translateX.value = withTiming(-SCREEN_WIDTH * 1.2, { duration: 280 });
        runOnJS(mediumHaptic)();
        runOnJS(finalizeChoice)(dilemma.optionB);
      } else {
        translateX.value = withSpring(0, { damping: 14 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
          [-12, 0, 12],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));
  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root]}
      entering={FadeInUp.duration(360)}
      pointerEvents="box-none"
    >
      {/* Darkening gradient behind the card so options read clearly */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(7,14,24,0.55)', 'rgba(7,14,24,0.15)', 'rgba(7,14,24,0.65)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Scenario, top sticker */}
      <Animated.View
        entering={FadeInDown.duration(320).delay(80)}
        style={[styles.scenarioWrap, { marginTop: insets.top + 16 }]}
        pointerEvents="none"
      >
        <View
          style={styles.scenarioBubble}
          accessible
          accessibilityLabel={dilemma.scenario}
        >
          <Text style={styles.scenarioText}>{dilemma.scenario}</Text>
        </View>
      </Animated.View>

      {/* Swipeable card middle */}
      <View style={styles.cardArea} pointerEvents="box-none">
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[styles.card, cardStyle]}
            accessibilityRole="adjustable"
            accessibilityLabel={`דילמה: ${dilemma.scenario}. החלק ימינה לאופציה ${dilemma.optionA.label}, שמאלה לאופציה ${dilemma.optionB.label}.`}
          >
            {/* Card content */}
            <Text style={styles.cardHeadline}>מה הייתי עושה?</Text>
            <Text style={styles.cardScenario}>{dilemma.scenario}</Text>

            {/* Left/right preview labels for the two options */}
            <View style={styles.optionRow}>
              <View style={styles.optionLeft}>
                <Text style={styles.optionArrow}>←</Text>
                <Text style={styles.optionLabel} numberOfLines={2}>
                  {dilemma.optionB.label}
                </Text>
              </View>
              <View style={styles.optionRight}>
                <Text style={styles.optionLabel} numberOfLines={2}>
                  {dilemma.optionA.label}
                </Text>
                <Text style={styles.optionArrow}>→</Text>
              </View>
            </View>

            {/* Swipe-direction overlays — Daisy reacts in advance to the
                user's pending choice. Right swipe = optionA (wise) →
                celebrate loop. Left swipe = optionB (unwise) → empathic
                loop. The overlay opacity already scales with translation,
                so Daisy fades in gradually as the user commits.
                pointerEvents="none" is critical here: these overlays
                cover the entire card and would otherwise swallow the pan
                gesture when the user starts dragging from the top half
                of the card. */}
            <Animated.View
              style={[styles.directionOverlay, styles.overlayLeft, leftOverlayStyle]}
              pointerEvents="none"
            >
              <ExpoImage
                source={dilemma.optionB.isWise ? DAISY_HAPPY_CELEBRATE_WEBP : DAISY_EMPATHIC_WEBP}
                style={styles.overlayDaisy}
                contentFit="contain"
                accessible={false}
              />
              <Text style={styles.directionOverlayText}>{dilemma.optionB.label}</Text>
            </Animated.View>
            <Animated.View
              style={[styles.directionOverlay, styles.overlayRight, rightOverlayStyle]}
              pointerEvents="none"
            >
              <ExpoImage
                source={dilemma.optionA.isWise ? DAISY_HAPPY_CELEBRATE_WEBP : DAISY_EMPATHIC_WEBP}
                style={styles.overlayDaisy}
                contentFit="contain"
                accessible={false}
              />
              <Text style={styles.directionOverlayText}>{dilemma.optionA.label}</Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Bottom hint */}
      <Animated.View
        entering={FadeInUp.duration(320).delay(180)}
        style={[styles.bottomHint, { paddingBottom: insets.bottom + 18 }]}
        pointerEvents="none"
      >
        <Text style={styles.bottomHintText}>👉 החלק לכיוון שלך</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },

  scenarioWrap: {
    paddingHorizontal: 18,
  },
  scenarioBubble: {
    backgroundColor: 'rgba(236,72,153,0.94)',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.30)',
    shadowColor: '#ec4899',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
  },
  scenarioText: {
    color: '#ffffff',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'right',
    writingDirection: 'rtl',
  },

  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    aspectRatio: 0.78,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(14,165,233,0.45)',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.4,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  cardHeadline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0891b2',
    letterSpacing: 1,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  cardScenario: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: 8,
    lineHeight: 28,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  optionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(244,114,182,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(244,114,182,0.4)',
  },
  optionRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.4)',
  },
  optionArrow: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0c4a6e',
  },
  optionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0c4a6e',
    textAlign: 'center',
    writingDirection: 'rtl',
  },

  directionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    gap: 6,
  },
  overlayDaisy: {
    width: 96,
    height: 96,
  },
  overlayLeft: {
    backgroundColor: 'rgba(244,114,182,0.78)',
  },
  overlayRight: {
    backgroundColor: 'rgba(14,165,233,0.78)',
  },
  directionOverlayText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: 18,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 6,
  },

  bottomHint: {
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  bottomHintText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 6,
  },
});
