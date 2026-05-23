import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FANTASY } from '../../../constants/theme';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';

type Tier = 'silver' | 'gold' | 'diamond';

interface LeaguePrizesCardProps {
  tier: Tier;
  tierLabel: string;
  entryCost: number;
  prizeMultipliers: readonly [number, number, number, number, number];
  prizeDiamonds:    readonly [number, number, number, number, number];
  prizeXP?:         readonly [number, number, number, number, number];
  /** Highlights the row that matches the player's current rank. */
  currentRank?: number;
}

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };
const NUM_STYLE = { fontVariant: ['tabular-nums' as const] };

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'] as const;
const PLACE_LABELS = ['מקום ראשון', 'מקום שני', 'מקום שלישי', 'מקום רביעי', 'מקום חמישי'] as const;

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

interface PrizeRowProps {
  place: number;
  coins: number;
  diamonds: number;
  xp: number;
  highlight: boolean;
}

function PrizeRow({ place, coins, diamonds, xp, highlight }: PrizeRowProps): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: highlight ? '#fffbeb' : 'transparent',
        borderWidth: highlight ? 1.5 : 0,
        borderColor: highlight ? FANTASY.goldStroke : 'transparent',
      }}
    >
      <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{MEDALS[place - 1]}</Text>
      <Text style={{
        fontSize: 12,
        fontWeight: '800',
        color: highlight ? FANTASY.warningDark : FANTASY.inkLabel,
        ...RTL,
        flex: 1,
      }}>
        {PLACE_LABELS[place - 1]}
      </Text>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
          <GoldCoinIcon size={13} />
          <Text style={[
            { fontSize: 13, fontWeight: '900', color: FANTASY.ink },
            NUM_STYLE,
          ]}>
            {formatCoins(coins)}
          </Text>
        </View>
        {diamonds > 0 && (
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 11 }}>💎</Text>
            <Text style={[
              { fontSize: 12, fontWeight: '900', color: FANTASY.primary },
              NUM_STYLE,
            ]}>
              {diamonds}
            </Text>
          </View>
        )}
        {xp > 0 && (
          <Text style={[
            { fontSize: 10, fontWeight: '800', color: FANTASY.inkFaint },
            NUM_STYLE,
          ]}>
            +{xp} XP
          </Text>
        )}
      </View>
    </View>
  );
}

export function LeaguePrizesCard({
  tier,
  tierLabel,
  entryCost,
  prizeMultipliers,
  prizeDiamonds,
  prizeXP,
  currentRank,
}: LeaguePrizesCardProps): React.ReactElement {
  // Consolation = 10% of entry for rank 6+ (matches claimResults logic).
  const consolationCoins = Math.round(entryCost * 0.1);
  void tier;

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
      <View style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingHorizontal: 4,
      }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 16 }}>🏆</Text>
          <Text style={{
            fontSize: 14,
            fontWeight: '900',
            color: FANTASY.warningDark,
            ...RTL,
          }}>
            פרסי {tierLabel}
          </Text>
        </View>
        {currentRank != null && (
          <View style={{
            backgroundColor: FANTASY.surfaceCard,
            borderWidth: 1,
            borderColor: FANTASY.borderStrong,
            paddingVertical: 2,
            paddingHorizontal: 8,
            borderRadius: 999,
          }}>
            <Text style={[
              { fontSize: 10, fontWeight: '900', color: FANTASY.ink },
              NUM_STYLE,
            ]}>
              המיקום שלך · #{currentRank}
            </Text>
          </View>
        )}
      </View>

      {/* Prize rows 1-5 */}
      <View style={{ gap: 2 }}>
        {[1, 2, 3, 4, 5].map((place) => {
          const i = place - 1;
          const coins = Math.round(entryCost * prizeMultipliers[i]);
          const diamonds = prizeDiamonds[i] ?? 0;
          const xp = prizeXP?.[i] ?? 0;
          return (
            <PrizeRow
              key={place}
              place={place}
              coins={coins}
              diamonds={diamonds}
              xp={xp}
              highlight={currentRank === place}
            />
          );
        })}
      </View>

      {/* Consolation footer */}
      <View style={{
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#fde68a',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
      }}>
        <Text style={{
          fontSize: 11,
          fontWeight: '800',
          color: FANTASY.inkMuted,
          ...RTL,
        }}>
          מקום 6 ומטה · ניחומים
        </Text>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
          <GoldCoinIcon size={11} />
          <Text style={[
            { fontSize: 11, fontWeight: '900', color: FANTASY.inkMuted },
            NUM_STYLE,
          ]}>
            {formatCoins(consolationCoins)}
          </Text>
        </View>
      </View>

      {/* Entry hint */}
      <Text style={{
        marginTop: 6,
        fontSize: 10,
        color: FANTASY.inkFaint,
        fontWeight: '700',
        textAlign: 'center',
        writingDirection: 'rtl',
      }}>
        עלות כניסה: {formatCoins(entryCost)} 🪙 · קופה אחת לשבוע
      </Text>
    </LinearGradient>
  );
}
