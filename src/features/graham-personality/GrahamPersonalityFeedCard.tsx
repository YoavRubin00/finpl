/**
 * Feed card teaser for the Graham Investor Personality Test.
 * Shows once in the feed rotation; tapping opens the full test.
 */

import { useCallback } from 'react';
import { Image as ExpoImage } from "expo-image";
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { FeedStartButton } from '../finfeed/minigames/shared/FeedStartButton';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { SIM_LOTTIE } from '../shared-sim/simLottieMap';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { tapHaptic } from '../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Props {
  isActive: boolean;
}

export function GrahamPersonalityFeedCard({ isActive: _isActive }: Props) {
  const router = useRouter();
  const { playSound } = useSoundEffect();

  const handlePress = useCallback(() => {
    tapHaptic();
    playSound('btn_click_heavy');
    router.push('/graham-personality' as never);
  }, [router, playSound]);

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16 }}>
      <LinearGradient
        colors={['#f0f9ff', '#e0f2fe', '#f0f9ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          padding: 24,
          borderWidth: 1.5,
          borderColor: '#bae6fd',
          borderBottomWidth: 3,
          borderBottomColor: '#7dd3fc',
          shadowColor: '#0891b2',
          shadowOpacity: 0.15,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        {/* Header row */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <LottieIcon source={SIM_LOTTIE.brain} size={28} />
          <Text style={[{ fontSize: 13, fontWeight: '700', color: '#0891b2', letterSpacing: 0.5 }, RTL]}>
            מבחן אישיות פיננסי
          </Text>
        </View>

        {/* Title */}
        <Text style={[{
          fontSize: 22,
          fontWeight: '900',
          color: '#0c4a6e',
          marginBottom: 8,
        }, RTL]}>
          איזה סוג משקיעים אתם?
        </Text>

        {/* Subtitle */}
        <Text style={[{
          fontSize: 15,
          fontWeight: '600',
          color: '#0369a1',
          marginBottom: 16,
          lineHeight: 22,
        }, RTL]}>
          8 שאלות קצרות — גלו אם אתם הגנתיים, יזומים, רציונליים או ספקולנטים
        </Text>

        {/* Finn avatar */}
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <ExpoImage source={FINN_STANDARD} accessible={false} style={{ width: 64, height: 64 }} contentFit="contain" />
        </View>

        {/* CTA */}
        <FeedStartButton
          label="התחל"
          onPress={handlePress}
          accessibilityLabel="התחל מבחן אישיות פיננסי"
        />
      </LinearGradient>
    </Animated.View>
  );
}
