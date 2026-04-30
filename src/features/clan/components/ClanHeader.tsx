import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSquadsStore } from '../../social/useSquadsStore';
import { CLAN } from '../../../constants/theme';

interface ClanHeaderProps {
  onSettingsPress?: () => void;
}

export function ClanHeader({ onSettingsPress }: ClanHeaderProps): React.ReactElement {
  const squad = useSquadsStore((s) => s.squad);

  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        gap: 10,
      }}
    >
      {/* Back */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#ffffff', fontSize: 18 }}>→</Text>
      </Pressable>

      {/* Emblem */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(212,160,23,0.15)',
          borderWidth: 1.5,
          borderColor: CLAN.tierGold,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18 }}>🛡️</Text>
      </View>

      {/* Name */}
      <Text
        style={{
          flex: 1,
          fontSize: 17,
          fontWeight: '900',
          color: '#ffffff',
          writingDirection: 'rtl',
          textAlign: 'right',
        }}
        numberOfLines={1}
      >
        {squad?.name ?? 'הקבוצה'}
      </Text>

      {/* Settings kebab */}
      {onSettingsPress && (
        <Pressable
          onPress={onSettingsPress}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 18 }}>⋮</Text>
        </Pressable>
      )}
    </View>
  );
}
