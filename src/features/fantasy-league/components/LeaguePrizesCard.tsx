import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FANTASY } from '../../../constants/theme';

type Tier = 'silver' | 'gold' | 'diamond';

interface LeaguePrizesCardProps {
  tier: Tier;
  tierLabel: string;
  entryCost: number;
  // Kept for the caller's signature, but the rank-based prize model is frozen
  // (no real opponents), so these are no longer rendered — the card now shows
  // the honest current economy: 10% floor + XP + full refund (Moni ruling P0-2).
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
 * "What you earn" card. The rank-based 5×/diamond prize table was fabricated
 * (no real opponents settle) and read as a scam against the 10% that actually
 * pays out, so it's replaced with the honest current economy (Moni ruling P0-2).
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
  const floor = Math.round(entryCost * 0.1);

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
          marginBottom: 6,
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ fontSize: 16 }}>🏆</Text>
        <Text style={{ fontSize: 14, fontWeight: '900', color: FANTASY.warningDark, ...RTL }}>
          מה מרוויחים ב{tierLabel}
        </Text>
      </View>

      {/* Honest reward rows */}
      <View style={{ gap: 1 }}>
        <RewardRow emoji="🪙" title="10% מהקופה חוזר אליכם — תמיד" value={`${formatCoins(floor)} 🪙`} />
        <RewardRow emoji="⭐" title="XP על כל משחק" sub="בסיס + רצף דראפט + משימות" />
        <RewardRow
          emoji="🛟"
          title="לא דרפטתם? הקופה חוזרת במלואה"
          value={`${formatCoins(entryCost)} · 100%`}
        />
      </View>

      {/* Talent framing */}
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
        המשחק שלכם, הבחירות שלכם — הן שקובעות את הניקוד.
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
