import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useDuelsStore } from '../../social/useDuelsStore';
import { useClashStore } from '../../friends-clash/useClashStore';
import { DUO } from '../../../constants/theme';

export function DuelsClashCard(): React.ReactElement {
  const record = useDuelsStore((s) => s.record);
  const invites = useClashStore((s) => s.invites);

  const pendingClash = invites.filter((inv) => inv.status === 'pending');
  const total = (record?.wins ?? 0) + (record?.losses ?? 0) + (record?.draws ?? 0);
  const winRate = total > 0 ? Math.round(((record?.wins ?? 0) / total) * 100) : 0;

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
        <Text style={{ fontSize: 20 }}>⚔️</Text>
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
          דו-קרב ו-CLASH
        </Text>
        {pendingClash.length > 0 && (
          <View
            style={{
              backgroundColor: '#ef4444',
              borderRadius: 10,
              paddingHorizontal: 7,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#ffffff' }}>
              {pendingClash.length}
            </Text>
          </View>
        )}
      </View>

      {/* Record */}
      <View style={{ flexDirection: 'row-reverse', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'ניצחונות', value: record?.wins ?? 0, color: DUO.green },
          { label: 'הפסדים', value: record?.losses ?? 0, color: DUO.red },
          { label: 'תיקו', value: record?.draws ?? 0, color: '#94a3b8' },
          { label: 'אחוז ניצחון', value: `${winRate}%`, color: DUO.blue },
        ].map((stat) => (
          <View key={stat.label} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: stat.color }}>
              {stat.value}
            </Text>
            <Text style={{ fontSize: 10, color: '#64748b', writingDirection: 'rtl', textAlign: 'center' }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Pending CLASH invites */}
      {pendingClash.length > 0 && (
        <View
          style={{
            backgroundColor: '#fff7ed',
            borderRadius: 10,
            padding: 10,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 13, color: '#c2410c', fontWeight: '700', writingDirection: 'rtl' }}>
            {pendingClash[0].opponentName} מאתגר אותך!
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/friends')}
            style={{
              backgroundColor: DUO.orange,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#ffffff' }}>קבל אתגר</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
