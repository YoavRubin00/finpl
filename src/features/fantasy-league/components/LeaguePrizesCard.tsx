import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FANTASY } from '../../../constants/theme';
import { BEAT_MODEST_MULT, BEAT_CRUSH_MULT } from '../fantasyData';

type Tier = 'silver' | 'gold' | 'diamond';

interface LeaguePrizesCardProps {
  tier: Tier;
  tierLabel: string;
  entryCost: number;
  // Kept for the caller's signature; the rank-based prize model is frozen, so
  // these aren't rendered. The card shows the "beat the S&P 500" economy
  // (Moni RULING 2 / Fable P1-8): 1.1× on a beat, 1.5× on a crush, 10% floor.
  prizeMultipliers?: readonly number[];
  prizeDiamonds?: readonly number[];
  prizeXP?: readonly number[];
  currentRank?: number;
}

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const NUM_STYLE = { fontVariant: ['tabular-nums' as const] };

function formatCoins(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return n.toLocaleString('en-US');
}

interface RewardRowProps {
  emoji: string;
  title: string;
  sub?: string;
  value?: string;
}

function RewardRow({ emoji, title, sub, value }: RewardRowProps): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 7,
        paddingHorizontal: 6,
      }}
    >
      <Text style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: FANTASY.ink, ...RTL }}>{title}</Text>
        {sub ? (
          <Text style={{ fontSize: 10.5, color: FANTASY.inkMuted, ...RTL, marginTop: 1 }}>{sub}</Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[{ fontSize: 12.5, fontWeight: '900', color: FANTASY.warningDark }, NUM_STYLE]}>
          {value}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * "Beat the market" prize card (Moni RULING 2 / Fable P1-8). Scored vs the real
 * S&P 500 weekly return — a beat pays 1.1× the pool, a crush (≥5pp above) pays
 * 1.5× (capped), and you always keep the 10% floor. Gated on a positive return.
 */
export function LeaguePrizesCard({
  tier,
  tierLabel,
  entryCost,
  prizeMultipliers,
  prizeDiamonds,
  prizeXP,
  currentRank,
}: LeaguePrizesCardProps): React.ReactElement {
  void tier;
  void prizeMultipliers;
  void prizeDiamonds;
  void prizeXP;
  void currentRank;
  void tierLabel;
  const floor = Math.round(entryCost * 0.1);
  const beatCoins = Math.round(entryCost * BEAT_MODEST_MULT);
  const crushCoins = Math.round(entryCost * BEAT_CRUSH_MULT);

  return (
    <LinearGradient
      colors={['#fffbeb', '#ffffff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: FANTASY.goldStroke,
        paddingVertical: 12,
        paddingHorizontal: 12,
        shadowColor: FANTASY.gold,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 6,
          marginBottom: 2,
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ fontSize: 16 }}>🏆</Text>
        <Text style={{ fontSize: 14, fontWeight: '900', color: FANTASY.warningDark, ...RTL }}>
          נצחו את השוק
        </Text>
      </View>
      <Text
        style={{
          fontSize: 11.5,
          color: FANTASY.inkMuted,
          ...RTL,
          paddingHorizontal: 4,
          marginBottom: 8,
        }}
      >
        עברתם את תשואת ה-S&P 500?
      </Text>

      {/* Beat-the-market rows */}
      <View style={{ gap: 1 }}>
        <RewardRow
          emoji="✅"
          title="ניצחתם את השוק"
          sub="הקופה חוזרת + 10%"
          value={`${formatCoins(beatCoins)} 🪙`}
        />
        <RewardRow
          emoji="🔥"
          title="5% ומעלה מעל השוק"
          sub="הקופה + 50%"
          value={`${formatCoins(crushCoins)} 🪙`}
        />
        <RewardRow
          emoji="🛟"
          title="לא ניצחתם? 10% חוזר בכל מקרה"
          value={`${formatCoins(floor)} 🪙`}
        />
      </View>

      {/* Gate + XP */}
      <Text
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#fde68a',
          fontSize: 11,
          fontWeight: '700',
          color: FANTASY.inkMuted,
          ...RTL,
          textAlign: 'center',
        }}
      >
        רק תשואה חיובית נחשבת — אי אפשר לנצח בשבוע יורד. ועוד XP רציני על כל ניצחון.
      </Text>

      {/* Entry hint */}
      <Text
        style={{
          marginTop: 6,
          fontSize: 10,
          color: FANTASY.inkFaint,
          fontWeight: '700',
          textAlign: 'center',
          writingDirection: 'rtl',
        }}
      >
        עלות כניסה: {formatCoins(entryCost)} 🪙 · קופה אחת לשבוע
      </Text>
    </LinearGradient>
  );
}
