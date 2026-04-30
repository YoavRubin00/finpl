import React from 'react';
import { View, Text } from 'react-native';
import { MOCK_MEMBERS } from '../../clan/clanData';
import { STITCH, DUO } from '../../../constants/theme';

const MEDAL = ['🥇', '🥈', '🥉'];

const TOP3_BG = ['#fef9c3', '#f8fafc', '#fff7ed'];
const TOP3_BORDER = ['#fde68a', '#e2e8f0', '#fed7aa'];

export function FriendsLeaderboardCard(): React.ReactElement {
  const top5 = [...MOCK_MEMBERS].sort((a, b) => b.xp - a.xp).slice(0, 5);

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
      {/* ── Gold accent strip ── */}
      <View style={{ height: 4, backgroundColor: STITCH.tertiaryGoldBright, opacity: 0.8 }} />

      {/* ── Header ── */}
      <View
        style={{
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 14,
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: STITCH.surfaceHighest,
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: STITCH.tertiaryGoldLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 24 }}>🏆</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: STITCH.onSurface, writingDirection: 'rtl', textAlign: 'right' }}>
            לוח תוצאות
          </Text>
          <Text style={{ fontSize: 12, color: STITCH.onSurfaceVariant, writingDirection: 'rtl', textAlign: 'right', marginTop: 1 }}>
            דירוג לפי XP שנצבר
          </Text>
        </View>
      </View>

      {/* ── Rows ── */}
      {top5.map((member, i) => (
        <View
          key={member.id}
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 16,
            gap: 10,
            backgroundColor: i < 3 ? TOP3_BG[i] : '#ffffff',
            borderBottomWidth: i < top5.length - 1 ? 1 : 0,
            borderBottomColor: i < 3 ? TOP3_BORDER[i] : STITCH.surfaceHighest,
          }}
        >
          {/* Rank */}
          <View style={{ width: 30, alignItems: 'center' }}>
            <Text style={{ fontSize: i < 3 ? 20 : 13, fontWeight: '900', color: STITCH.onSurfaceVariant }}>
              {MEDAL[i] ?? `${i + 1}`}
            </Text>
          </View>

          {/* Avatar */}
          <Text style={{ fontSize: 22 }}>{member.avatar}</Text>

          {/* Name */}
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: i === 0 ? '900' : '700',
              color: STITCH.onSurface,
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {member.name}
          </Text>

          {/* XP */}
          <View
            style={{
              flexDirection: 'row-reverse',
              alignItems: 'baseline',
              gap: 3,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '900',
                color: i === 0 ? STITCH.tertiaryGold : DUO.blue,
              }}
            >
              {member.xp.toLocaleString('he-IL')}
            </Text>
            <Text style={{ fontSize: 10, color: STITCH.onSurfaceVariant }}>XP</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
