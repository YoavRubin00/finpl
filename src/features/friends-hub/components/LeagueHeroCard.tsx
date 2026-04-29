import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSquadsStore } from '../../social/useSquadsStore';
import { DUO } from '../../../constants/theme';

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

export function LeagueHeroCard(): React.ReactElement {
  const squad = useSquadsStore((s) => s.squad);
  const claimChest = useSquadsStore((s) => s.claimWeeklyChest);
  const hasClaimedWeeklyChest = useSquadsStore((s) => s.hasClaimedWeeklyChest);
  const chestReady = squad !== null && !hasClaimedWeeklyChest && (squad.weeklyScore ?? 0) > 0;

  const tier = squad?.tier ?? 'bronze';
  const rank = squad?.rank ?? '--';
  const weeklyScore = squad?.weeklyScore ?? 0;

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e3e5',
        padding: 16,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <Text style={{ fontSize: 22 }}>{TIER_EMOJI[tier]}</Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#191c1e', writingDirection: 'rtl' }}>
            ליגת {TIER_LABEL[tier]}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b', writingDirection: 'rtl' }}>
            דירוג שבועי
          </Text>
        </View>
        <View
          style={{
            backgroundColor: DUO.blueSurface,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '900', color: DUO.blue }}>#{rank}</Text>
        </View>
      </View>

      {/* Score */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: '#64748b', writingDirection: 'rtl' }}>
          {weeklyScore.toLocaleString('he-IL')} XP השבוע
        </Text>
        {chestReady && (
          <Pressable
            onPress={() => claimChest()}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#15803d' : DUO.green,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 6,
            })}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff', writingDirection: 'rtl' }}>
              פתח אסם 🎁
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}