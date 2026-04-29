import React from 'react';
import { View, Text } from 'react-native';
import { MOCK_MEMBERS } from '../../clan/clanData';
import { DUO } from '../../../constants/theme';

const MEDAL = ['🥇', '🥈', '🥉'];

export function FriendsLeaderboardCard(): React.ReactElement {
  const top5 = [...MOCK_MEMBERS].sort((a, b) => b.xp - a.xp).slice(0, 5);

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
      <Text
        style={{
          fontSize: 15,
          fontWeight: '900',
          color: '#191c1e',
          writingDirection: 'rtl',
          textAlign: 'right',
          marginBottom: 12,
        }}
      >
        🏆 לוח תוצאות
      </Text>
      {top5.map((member, i) => (
        <View
          key={member.id}
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            paddingVertical: 6,
            gap: 10,
            borderBottomWidth: i < top5.length - 1 ? 1 : 0,
            borderBottomColor: '#f1f5f9',
          }}
        >
          <Text style={{ fontSize: 16, width: 28, textAlign: 'center' }}>
            {MEDAL[i] ?? `${i + 1}`}
          </Text>
          <Text style={{ fontSize: 20 }}>{member.avatar}</Text>
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: '700',
              color: '#191c1e',
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {member.name}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '800', color: DUO.blue }}>
            {member.xp.toLocaleString('he-IL')}
          </Text>
          <Text style={{ fontSize: 11, color: '#94a3b8' }}>XP</Text>
        </View>
      ))}
    </View>
  );
}
