import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapHaptic } from '../../utils/haptics';
import { DAISY_ASSETS, DAISY_HAPPY_BLINK_WEBP } from '../podcast-segment/daisy-assets';
import type { CoupleDilemmaOption } from '../chapter-1-content/types';

interface Props {
  chosen: CoupleDilemmaOption;
  onContinue: () => void;
}

export function CoupleDilemmaFeedback({ chosen, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const wise = chosen.isWise;

  return (
    <Animated.View
      entering={FadeIn.duration(380)}
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient
        colors={wise ? ['#f0f9ff', '#dbeafe'] : ['#fffbeb', '#fef3c7']}
        style={StyleSheet.absoluteFill}
      />

      {/* Speech bubble, top */}
      <Animated.View
        entering={FadeInDown.duration(360).delay(140)}
        style={[styles.bubbleWrap, { marginTop: insets.top + 24 }]}
        pointerEvents="none"
      >
        <View
          style={[styles.bubble, wise ? styles.bubbleWise : styles.bubbleNotWise]}
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${wise ? 'בחירה חכמה' : 'נקודה למחשבה'}. ${chosen.feedback}`}
        >
          <Text style={[styles.bubbleLabel, wise ? styles.labelWise : styles.labelNotWise]}>
            {wise ? '✓ בחירה חכמה' : '💭 נקודה למחשבה'}
          </Text>
          <Text style={[styles.bubbleBody, wise ? styles.bodyWise : styles.bodyNotWise]}>
            {chosen.feedback}
          </Text>
        </View>
      </Animated.View>

      {/* Daisy WebP, center — wise = animated blinking sticker on transparent
          bg so it composes cleanly over the gradient. empathic still uses the
          studio still for now (will get the same treatment in a follow-up). */}
      <View style={styles.daisyWrap} pointerEvents="none">
        <Animated.View entering={FadeIn.duration(420).delay(80)}>
          <ExpoImage
            source={wise ? DAISY_HAPPY_BLINK_WEBP : DAISY_ASSETS.empathic}
            style={styles.daisy}
            contentFit="contain"
            accessible={false}
          />
        </Animated.View>
      </View>

      {/* CTA bottom */}
      <Animated.View
        entering={FadeInUp.duration(340).delay(240)}
        style={[styles.ctaWrap, { paddingBottom: insets.bottom + 22 }]}
      >
        <Pressable
          onPress={() => {
            tapHaptic();
            onContinue();
          }}
          accessibilityRole="button"
          accessibilityLabel="המשך"
        >
          {({ pressed }) => (
            <View style={[styles.cta, pressed && styles.ctaPressed]}>
              <Text style={styles.ctaText}>המשך</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: {
    paddingHorizontal: 18,
  },
  bubble: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  bubbleWise: {
    backgroundColor: 'rgba(34,197,94,0.96)',
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#22c55e',
  },
  bubbleNotWise: {
    backgroundColor: 'rgba(250,204,21,0.96)',
    borderColor: 'rgba(0,0,0,0.10)',
    shadowColor: '#facc15',
  },
  bubbleLabel: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  labelWise: { color: '#052e16' },
  labelNotWise: { color: '#422006' },
  bubbleBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bodyWise: { color: '#062b15' },
  bodyNotWise: { color: '#1f1300' },

  daisyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daisy: {
    width: 220,
    height: 220,
  },

  ctaWrap: {
    paddingHorizontal: 18,
  },
  cta: {
    backgroundColor: '#0ea5e9',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0284c7',
    borderBottomWidth: 5,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaPressed: {
    opacity: 0.95,
    transform: [{ translateY: 2 }],
    borderBottomWidth: 3,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
});
