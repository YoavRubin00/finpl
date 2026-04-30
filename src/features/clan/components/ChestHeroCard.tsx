import React, { useEffect } from 'react';
import { View, Text, Pressable, Image } from 'react-native';

const TROPHY_URI = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/clan/trophy-gold.png';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';

interface ChestHeroCardProps {
  chestPoints: number;
  maxPoints: number;
  isReady: boolean;
  isClaimed: boolean;
  onClaim: () => void;
}

export function ChestHeroCard({
  chestPoints,
  maxPoints,
  isReady,
  isClaimed,
  onClaim,
}: ChestHeroCardProps): React.ReactElement {
  const pct = Math.min(1, chestPoints / maxPoints);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isReady && !isClaimed) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [isReady, isClaimed, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(80).duration(300)} style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <View
        style={{
          backgroundColor: CLAN.cardBg,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: isReady ? CLAN.tierGold : 'rgba(255,255,255,0.1)',
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 14 }}>
          {/* Chest icon */}
          <Animated.View style={pulseStyle}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: isReady ? 'rgba(212,160,23,0.2)' : 'rgba(255,255,255,0.06)',
                borderWidth: 2.5,
                borderColor: isReady ? CLAN.tierGold : 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isClaimed ? (
                <Image
                  source={{ uri: TROPHY_URI }}
                  style={{ width: 48, height: 48 }}
                  resizeMode="contain"
                  accessible={false}
                />
              ) : (
                <Text style={{ fontSize: 38 }} accessible={false}>{isReady ? '🎁' : '📦'}</Text>
              )}
            </View>
          </Animated.View>

          {/* Info */}
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
              {S.clanChest}
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: isReady ? CLAN.tierGoldLight : '#ffffff' }}>
              {S.chestProgress(chestPoints, maxPoints)}
            </Text>

            {/* Progress track */}
            <View
              style={{
                width: '100%',
                height: 10,
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: 5,
                overflow: 'hidden',
                marginTop: 2,
              }}
            >
              <View
                style={{
                  height: 10,
                  width: `${pct * 100}%`,
                  backgroundColor: isReady ? CLAN.tierGold : CLAN.tierGoldLight,
                  borderRadius: 5,
                }}
              />
            </View>

            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', writingDirection: 'rtl', marginTop: 2 }}>
              {isClaimed ? S.claimedThisWeek : isReady ? S.chestReady : S.weeklyGoalsSubtitle}
            </Text>
          </View>
        </View>

        {isReady && !isClaimed && (
          <Pressable
            onPress={onClaim}
            accessibilityLabel={S.claimChest}
            accessibilityRole="button"
            style={({ pressed }) => ({
              marginTop: 14,
              backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight,
              borderRadius: 14,
              paddingVertical: 12,
              alignItems: 'center',
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#0a1628' }}>
              {S.claimChest} 🎁
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
