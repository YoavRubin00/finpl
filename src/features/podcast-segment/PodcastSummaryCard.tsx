import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { DAISY_HAPPY_CELEBRATE_WEBP } from './daisy-assets';
import type { PodcastSegment } from '../chapter-1-content/types';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'center' as const };

interface Props {
  podcast: PodcastSegment;
  onContinue: () => void;
}

export const PodcastSummaryCard = React.memo(function PodcastSummaryCard({
  podcast: _podcast,
  onContinue,
}: Props) {
  const insets = useSafeAreaInsets();
  // See PodcastIntroCard for the same width fix — module-level Dimensions
  // returns 0 on Android cold start, so the inline width comes from a hook.
  const { width: windowW } = useWindowDimensions();
  const continueBtnWidth = windowW - 48;
  useEffect(() => {
    successHaptic();
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#bae6fd', '#fce7e7', '#fbcfe8']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* Calm FadeIn — the previous ZoomIn.springify made Daisy bounce
            in like she was vibrating. The celebrating WebP is now the
            energy: an animated celebration loop replaces the static
            happy.png so the moment actually feels like an arrival. */}
        <Animated.View
          entering={FadeIn.duration(420)}
          style={styles.daisyWrap}
        >
          <View style={styles.daisyHalo} />
          <ExpoImage
            source={DAISY_HAPPY_CELEBRATE_WEBP}
            style={styles.daisyImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(380).delay(160).springify()}>
          <Text style={[styles.title, RTL]}>🎙️ סיימתם להאזין!</Text>
          <Text style={[styles.subtitle, RTL]}>מוכנים לבחון את עצמכם?</Text>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.duration(400).delay(240)}
        style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}
      >
        <Pressable
          onPress={() => { tapHaptic(); onContinue(); }}
          accessibilityRole="button"
          accessibilityLabel="המשך לשאלות"
          style={({ pressed }) => [
            styles.continueBtn,
            { width: continueBtnWidth },
            pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.continueBtnText}>המשך לשאלות</Text>
          <ChevronLeft color="#ffffff" size={22} strokeWidth={2.6} />
        </Pressable>
      </Animated.View>
    </View>
  );
});

const DAISY_SIZE = 180;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fce7e7' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },

  daisyWrap: {
    width: DAISY_SIZE,
    height: DAISY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Soft pink halo behind the celebrating Daisy WebP. Opacity reduced from
  // 0.7 → 0.45 because the WebP already contains stars + coins as its own
  // visual celebration — the halo is now mood, not main course.
  daisyHalo: {
    position: 'absolute',
    width: DAISY_SIZE,
    height: DAISY_SIZE,
    borderRadius: DAISY_SIZE / 2,
    backgroundColor: '#fbcfe8',
    opacity: 0.45,
    shadowColor: '#f472b6',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
  },
  // Circular clip — the celebrating WebP includes stars + coins that pop out
  // toward the corners; the user wants them contained within the same pink
  // circle as the halo, so the celebration feels like an ornament inside a
  // medallion. overflow:'hidden' is mandatory on Android for borderRadius
  // to actually clip an animated image.
  daisyImage: {
    width: DAISY_SIZE - 16,
    height: DAISY_SIZE - 16,
    borderRadius: (DAISY_SIZE - 16) / 2,
    overflow: 'hidden',
  },

  title: {
    color: '#0c2138',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  subtitle: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    alignItems: 'stretch',
  },
  // Standard app primary CTA — width injected inline from useWindowDimensions
  // (NOT a module-level Dimensions read: that returns 0 on Android cold start).
  continueBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0ea5e9',
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#0284c7',
    borderBottomWidth: 5,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
