import React from 'react';
import { View, Text } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FANTASY_ASSETS } from '../cloudAssets';

export type LeagueMovementType = 'promoted' | 'demoted';

interface Props {
  type: LeagueMovementType;
}

const CONFIG: Record<LeagueMovementType, {
  colors: [string, string];
  border: string;
  arrow: string;
  arrowColor: string;
  title: string;
  subtitle: string;
  textColor: string;
}> = {
  promoted: {
    colors: ['rgba(16,185,129,0.25)', 'rgba(250,204,21,0.18)'],
    border: 'rgba(74,222,128,0.4)',
    arrow: '▲',
    arrowColor: '#4ade80',
    title: 'עלית ליגה!',
    subtitle: 'נכנסת ל-20% העליונים — כל הכבוד',
    textColor: '#dcfce7',
  },
  demoted: {
    colors: ['rgba(51,65,85,0.5)', 'rgba(127,29,29,0.3)'],
    border: 'rgba(248,113,113,0.3)',
    arrow: '▼',
    arrowColor: '#f87171',
    title: 'ירדת ליגה',
    subtitle: 'שבוע הבא הזדמנות לחזרה — אנחנו מאמינים בך',
    textColor: 'rgba(255,255,255,0.85)',
  },
};

const URL_KEY = {
  promoted: 'promotionBanner',
  demoted: 'demotionBanner',
} as const;

export function LeagueMovementBanner({ type }: Props): React.ReactElement {
  const url = FANTASY_ASSETS[URL_KEY[type]];
  const cfg = CONFIG[type];

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: cfg.border,
      }}
      accessibilityRole="text"
      accessibilityLabel={`${cfg.title}. ${cfg.subtitle}`}
    >
      {url ? (
        <ExpoImage
          source={{ uri: url }}
          style={{ width: '100%', height: 80 }}
          contentFit="cover"
          cachePolicy="disk"
          accessible={false}
        />
      ) : (
        <LinearGradient
          colors={cfg.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 28, color: cfg.arrowColor, fontWeight: '900' }}>
            {cfg.arrow}
          </Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '900',
                color: cfg.textColor,
                writingDirection: 'rtl',
                textAlign: 'right',
              }}
            >
              {cfg.title}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: cfg.textColor,
                opacity: 0.75,
                writingDirection: 'rtl',
                textAlign: 'right',
                marginTop: 2,
              }}
            >
              {cfg.subtitle}
            </Text>
          </View>
        </LinearGradient>
      )}
    </View>
  );
}
