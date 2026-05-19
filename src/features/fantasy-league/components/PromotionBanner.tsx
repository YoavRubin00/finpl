import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LEAGUE_GOLD } from '../../../constants/theme';
import { LeagueShield, type LeagueShieldPosition } from './LeagueShield';

interface Props {
  fromLeague: LeagueShieldPosition;
  toLeague: LeagueShieldPosition;
}

const LEAGUE_LABEL: Record<LeagueShieldPosition, string> = {
  bronze: 'ליגת ארד',
  silver: 'ליגת כסף',
  gold: 'ליגת זהב',
};

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

export function PromotionBanner({ fromLeague, toLeague }: Props): React.ReactElement {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: LEAGUE_GOLD.glow,
        shadowOpacity: 0.7,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
      accessibilityRole="text"
      accessibilityLabel={`עלית לליגה גבוהה! מ${LEAGUE_LABEL[fromLeague]} ל${LEAGUE_LABEL[toLeague]}`}
    >
      <LinearGradient
        colors={[LEAGUE_GOLD.bgFrom, LEAGUE_GOLD.bgTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 28 }}>🚀</Text>
        <View style={{ flex: 1 }}>
          <Text style={[{ fontSize: 16, fontWeight: '900', color: LEAGUE_GOLD.ink }, RTL]}>
            עלית לליגה גבוהה!
          </Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <LeagueShield position={fromLeague} size={20} />
            <Text style={{ fontSize: 13, color: LEAGUE_GOLD.ink, fontWeight: '800' }}>→</Text>
            <LeagueShield position={toLeague} size={24} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
