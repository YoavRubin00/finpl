import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSquadsStore } from '../../social/useSquadsStore';
import { CLAN } from '../../../constants/theme';

export function ClanHeroCard(): React.ReactElement {
  const squad = useSquadsStore((s) => s.squad);
  const hasSquad = squad !== null;

  return (
    <Pressable
      onPress={() => router.push('/clan')}
      accessibilityRole="button"
      accessibilityLabel={hasSquad ? `קלאן ${squad.name} — לחץ לכניסה` : 'הצטרף או צור קלאן'}
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: CLAN.tierGold,
        shadowOpacity: 0.22,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
        elevation: 5,
      })}
    >
      <LinearGradient
        colors={['#1a3a5c', '#0d2847']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: CLAN.tierGold,
          padding: 16,
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Emblem */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: 'rgba(212,160,23,0.15)',
            borderWidth: 1.5,
            borderColor: CLAN.tierGold,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 26 }}>{hasSquad ? '🛡️' : '⚔️'}</Text>
        </View>

        {/* Text */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '900',
              color: '#ffffff',
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {hasSquad ? squad.name : 'הקלאן שלך מחכה'}
          </Text>
          {hasSquad ? (
            <Text style={{ fontSize: 12, color: CLAN.tierGoldLight, marginTop: 2, writingDirection: 'rtl' }}>
              {squad.members.length} חברים · טפח על הכרטיס
            </Text>
          ) : (
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 2, writingDirection: 'rtl' }}>
              צור קלאן או הצטרף לקיים
            </Text>
          )}
        </View>

        {/* Arrow */}
        <Text style={{ fontSize: 18, color: CLAN.tierGold }}>←</Text>
      </LinearGradient>
    </Pressable>
  );
}