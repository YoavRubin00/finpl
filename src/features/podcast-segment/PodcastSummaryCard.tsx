import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { DAISY_ASSETS } from './daisy-assets';
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
        <Animated.View
          entering={ZoomIn.duration(480).springify().damping(12)}
          style={styles.daisyWrap}
        >
          <View style={styles.daisyHalo} />
          <ExpoImage
            source={DAISY_ASSETS.happy}
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
  daisyHalo: {
    position: 'absolute',
    width: DAISY_SIZE,
    height: DAISY_SIZE,
    borderRadius: DAISY_SIZE / 2,
    backgroundColor: '#fbcfe8',
    opacity: 0.7,
    shadowColor: '#f472b6',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
  },
  daisyImage: {
    width: DAISY_SIZE - 16,
    height: DAISY_SIZE - 16,
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
  },
  continueBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0ea5e9',
    borderRadius: 18,
    paddingVertical: 18,
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
