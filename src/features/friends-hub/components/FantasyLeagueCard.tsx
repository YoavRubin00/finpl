import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useFantasyStore } from '../../fantasy-league/useFantasyStore';
import { CURRENT_LEAGUE } from '../../fantasy-league/fantasyData';
import { DUO } from '../../../constants/theme';

export function FantasyLeagueCard(): React.ReactElement {
  const computePortfolioValue = useFantasyStore((s) => s.computePortfolioValue);
  const leaderboard = useFantasyStore((s) => s.leaderboard);
  const portfolio = useFantasyStore((s) => s.portfolio);

  const value = portfolio ? computePortfolioValue() : 0;
  // Self is the player with rank=1 or first entry; no isMe flag exists
  const selfRank = portfolio ? (leaderboard.find((e) => e.playerId === portfolio.playerId)?.rank ?? '--') : '--';
  const selfEntry = portfolio ? leaderboard.find((e) => e.playerId === portfolio.playerId) : null;
  const pnlPercent = selfEntry?.pnlPercent ?? 0;
  const pnlPositive = pnlPercent >= 0;

  const daysLeft = CURRENT_LEAGUE
    ? Math.max(0, Math.ceil((new Date(CURRENT_LEAGUE.endDate).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <Pressable
      onPress={() => router.push('/fantasy' as never)}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e3e5',
        padding: 16,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10, gap: 8 }}>
        <Text style={{ fontSize: 20 }}>📈</Text>
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: '900',
            color: '#191c1e',
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          פנטזיליג מניות
        </Text>
        <Text style={{ fontSize: 12, color: '#64748b' }}>{daysLeft} ימים נותרו</Text>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row-reverse', gap: 12 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '900', color: DUO.blue }}>
            #{selfRank}
          </Text>
          <Text style={{ fontSize: 10, color: '#64748b', writingDirection: 'rtl' }}>דירוג</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#191c1e' }}>
            {value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
          </Text>
          <Text style={{ fontSize: 10, color: '#64748b' }}>ש"ח FC</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '900',
              color: pnlPositive ? DUO.green : DUO.red,
            }}
          >
            {pnlPositive ? '+' : ''}{pnlPercent.toFixed(1)}%
          </Text>
          <Text style={{ fontSize: 10, color: '#64748b' }}>רווח/הפסד</Text>
        </View>
      </View>
    </Pressable>
  );
}
