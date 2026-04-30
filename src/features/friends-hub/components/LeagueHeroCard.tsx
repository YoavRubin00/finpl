import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSquadsStore } from '../../social/useSquadsStore';
import { STITCH, DUO } from '../../../constants/theme';
import { tapHaptic } from '../../../utils/haptics';

const TIER_EMOJI: Record<string, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  diamond: '💎',
};

const TIER_LABEL: Record<string, string> = {
  bronze: 'ברונזה',
  silver: 'כסף',
  gold: 'זהב',
  diamond: 'יהלום',
};

const TIER_COLOR: Record<string, string> = {
  bronze: '#a16207',
  silver: '#64748b',
  gold: '#b45309',
  diamond: '#0284c7',
};

const TIER_BG: Record<string, string> = {
  bronze: '#fef3c7',
  silver: '#f1f5f9',
  gold: '#fef9c3',
  diamond: '#e0f2fe',
};

export function LeagueHeroCard(): React.ReactElement {
  const squad = useSquadsStore((s) => s.squad);
  const claimChest = useSquadsStore((s) => s.claimWeeklyChest);
  const hasClaimedWeeklyChest = useSquadsStore((s) => s.hasClaimedWeeklyChest);
  const chestReady = squad !== null && !hasClaimedWeeklyChest && (squad.weeklyScore ?? 0) > 0;

  const tier = squad?.tier ?? 'bronze';
  const rank = squad?.rank ?? '--';
  const weeklyScore = squad?.weeklyScore ?? 0;
  const tierColor = TIER_COLOR[tier] ?? TIER_COLOR.bronze;
  const tierBg = TIER_BG[tier] ?? TIER_BG.bronze;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: STITCH.surfaceHighest,
        overflow: 'hidden',
        shadowColor: '#3e3c8f',
        shadowOpacity: 0.09,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {/* ── Tier accent strip ── */}
      <View style={{ height: 4, backgroundColor: tierColor, opacity: 0.7 }} />

      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          gap: 10,
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: tierBg,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: tierColor + '40',
          }}
        >
          <Text style={{ fontSize: 24 }}>{TIER_EMOJI[tier]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', letterSpacing: 0.4 }}>
            ליגה שבועית
          </Text>
          <Text style={{ fontSize: 17, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right', marginTop: 1 }}>
            ליגת {TIER_LABEL[tier]}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: DUO.blueSurface,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: DUO.blue + '30',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '900', color: DUO.blue }}>#{rank}</Text>
        </View>
      </View>

      {/* ── Stats row ── */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingBottom: 14,
          borderTopWidth: 1,
          borderTopColor: STITCH.surfaceHighest,
          paddingTop: 12,
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 20 }}>⚡</Text>
          <Text style={{ fontSize: 14, fontWeight: '800', color: STITCH.onSurface }}>
            {weeklyScore.toLocaleString('he-IL')}
          </Text>
          <Text style={{ fontSize: 12, color: STITCH.onSurfaceVariant, writingDirection: 'rtl' }}>XP השבוע</Text>
        </View>

        {chestReady ? (
          <Pressable
            onPress={() => {
              tapHaptic();
              claimChest();
            }}
            accessibilityRole="button"
            accessibilityLabel="פתח אסם שבועי"
            style={({ pressed }) => ({
              backgroundColor: pressed ? DUO.greenDark : DUO.green,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 8,
              borderBottomWidth: 4,
              borderBottomColor: '#15803d',
              transform: [{ translateY: pressed ? 2 : 0 }],
              shadowColor: DUO.green,
              shadowOpacity: 0.35,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 3,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
              פתח אסם 🎁
            </Text>
          </Pressable>
        ) : (
          <View
            style={{
              backgroundColor: STITCH.surfaceLow,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ fontSize: 12, color: STITCH.onSurfaceVariant, writingDirection: 'rtl' }}>
              צבור XP לפתיחה
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
