import React from 'react';
import { View, Text, ImageBackground } from 'react-native';

const PINNED_BG_URI = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/clan/pinned-bg.png';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';

interface WeeklyWarBannerProps {
  rank?: number;
  totalGroups?: number;
  daysLeft?: number;
  progressPct?: number;
}

export function WeeklyWarBanner({
  rank = 4,
  totalGroups = 20,
  daysLeft = 3,
  progressPct = 0.62,
}: WeeklyWarBannerProps): React.ReactElement {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <ImageBackground
        source={{ uri: PINNED_BG_URI }}
        accessible={false}
        imageStyle={{ borderRadius: 16, opacity: 0.35 }}
        style={{
          backgroundColor: '#0d2040',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(212,160,23,0.25)',
          padding: 14,
          overflow: 'hidden',
        }}
      >
        {/* Title row */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>⚔️</Text>
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
              {S.weeklyWar}
            </Text>
          </View>

          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                backgroundColor: 'rgba(212,160,23,0.15)',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: 'rgba(212,160,23,0.3)',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: CLAN.tierGoldLight }}>
                {S.warRank(rank, totalGroups)}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: 'rgba(239,68,68,0.12)',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.25)',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fca5a5' }}>
                {S.warDaysLeft(daysLeft)}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
          <View
            style={{
              height: 8,
              width: `${progressPct * 100}%`,
              backgroundColor: CLAN.tierGold,
              borderRadius: 4,
            }}
          />
        </View>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 5, writingDirection: 'rtl', textAlign: 'right' }}>
          {S.warProgress}
        </Text>
      </ImageBackground>
    </Animated.View>
  );
}
