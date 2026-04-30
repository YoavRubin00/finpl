import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';
import type { MockMember } from '../clanData';
import { SELF_ID } from '../clanData';

interface MemberContributionCardProps {
  member: MockMember;
  isTopContributor: boolean;
  selfReputation?: number;
  onPress: (member: MockMember) => void;
  index?: number;
}

export function MemberContributionCard({
  member,
  isTopContributor,
  selfReputation,
  onPress,
  index = 0,
}: MemberContributionCardProps): React.ReactElement {
  const reputation =
    member.id === SELF_ID && selfReputation !== undefined ? selfReputation : member.reputation;

  const roleIcon = member.role === 'leader' ? '👑' : member.role === 'deputy' ? '⭐' : '•';
  const roleColor =
    member.role === 'leader'
      ? CLAN.tierGold
      : member.role === 'deputy'
      ? '#a78bfa'
      : 'rgba(255,255,255,0.4)';
  const roleLabel =
    member.role === 'leader' ? S.roleLeader : member.role === 'deputy' ? S.roleDeputy : S.roleMember;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(260)} style={{ flex: 1 }}>
      <Pressable
        onPress={() => onPress(member)}
        accessibilityLabel={`${member.name} — ${roleLabel}`}
        accessibilityRole="button"
        style={({ pressed }) => ({
          backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : CLAN.cardBg,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: isTopContributor ? CLAN.tierGold : 'rgba(255,255,255,0.08)',
          padding: 14,
          alignItems: 'center',
          gap: 6,
        })}
      >
        {/* Top contributor crown badge */}
        {isTopContributor && (
          <View
            style={{
              position: 'absolute',
              top: -8,
              backgroundColor: CLAN.tierGold,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#0a1628' }}>
              🏆 תורם השבוע
            </Text>
          </View>
        )}

        {/* Avatar with ring */}
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: isTopContributor ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.06)',
            borderWidth: 2.5,
            borderColor: isTopContributor ? CLAN.tierGold : roleColor,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: isTopContributor ? 6 : 0,
          }}
        >
          <Text style={{ fontSize: 30 }} accessible={false}>{member.avatar}</Text>
        </View>

        {/* Role */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 11 }}>{roleIcon}</Text>
          <Text style={{ fontSize: 10, color: roleColor, fontWeight: '700', writingDirection: 'rtl' }}>
            {roleLabel}
          </Text>
        </View>

        {/* Name */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '900',
            color: '#ffffff',
            writingDirection: 'rtl',
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          {member.name}
        </Text>

        {/* XP pill */}
        <View
          style={{
            backgroundColor: 'rgba(167,139,250,0.12)',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#a78bfa' }}>
            {member.xp.toLocaleString('he-IL')} XP
          </Text>
        </View>

        {/* Reputation */}
        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', writingDirection: 'rtl' }}>
          {reputation} מוניטין
        </Text>
      </Pressable>
    </Animated.View>
  );
}
