import React from 'react';
import { Pressable, View, Text, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { MockMember, ClanRole } from '../clanData';
import { S } from '../strings';
import { CLAN } from '../../../constants/theme';

const ROLE_LABELS: Record<ClanRole, string> = {
  leader: S.roleLeader,
  deputy: S.roleDeputy,
  member: S.roleMember,
};

const ROLE_COLORS: Record<ClanRole, string> = {
  leader: CLAN.tierGold,
  deputy: CLAN.tierSilver,
  member: 'rgba(255,255,255,0.4)',
};

interface MemberRowProps {
  member: MockMember;
  rank: number;
  onPress: (member: MockMember) => void;
  index?: number;
}

export function MemberRow({ member, rank, onPress, index = 0 }: MemberRowProps): React.ReactElement {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(280)}>
      <Pressable
        onPress={() => onPress(member)}
        style={({ pressed }) => ({
          flexDirection: 'row-reverse',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: pressed ? 'rgba(255,255,255,0.05)' : 'transparent',
          gap: 12,
        })}
      >
        {/* Rank */}
        <Text
          style={{
            width: 24,
            fontSize: 13,
            fontWeight: '700',
            color: rank <= 3 ? CLAN.tierGold : 'rgba(255,255,255,0.35)',
            textAlign: 'center',
          }}
        >
          {rank}
        </Text>

        {/* Avatar */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: member.role === 'leader' ? 1.5 : 0,
            borderColor: CLAN.tierGold,
          }}
        >
          {member.avatar === '🦈' ? (
            <Image
              source={require('../../../../assets/webp/fin-standard.webp')}
              style={{ width: 26, height: 26 }}
              resizeMode="contain"
            />
          ) : (
            <Text style={{ fontSize: 20 }}>{member.avatar}</Text>
          )}
        </View>

        {/* Name + role */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: '#ffffff',
              writingDirection: 'rtl',
              textAlign: 'right',
            }}
          >
            {member.name}
          </Text>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 1,
              marginTop: 2,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: ROLE_COLORS[member.role],
              }}
            >
              {ROLE_LABELS[member.role]}
            </Text>
          </View>
        </View>

        {/* XP stat */}
        <View style={{ alignItems: 'center', minWidth: 52 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#a78bfa' }}>
            {member.xp.toLocaleString('he-IL')}
          </Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>XP</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
