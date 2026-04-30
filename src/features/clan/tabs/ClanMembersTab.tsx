import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, Modal } from 'react-native';
import { MOCK_MEMBERS, SELF_ID } from '../clanData';
import type { MockMember } from '../clanData';
import { MemberContributionCard } from '../components/MemberContributionCard';
import { useDonationsStore } from '../useDonationsStore';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';

type SortKey = 'xp' | 'coins' | 'reputation';

export function ClanMembersTab(): React.ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>('xp');
  const [selectedMember, setSelectedMember] = useState<MockMember | null>(null);
  const selfReputation = useDonationsStore((s) => s.selfReputation);

  const sortedMembers: MockMember[] = [...MOCK_MEMBERS]
    .map((m) => (m.id === SELF_ID ? { ...m, reputation: selfReputation } : { ...m }))
    .sort((a, b) => {
      if (sortKey === 'xp') return b.xp - a.xp;
      if (sortKey === 'coins') return b.coins - a.coins;
      return b.reputation - a.reputation;
    });

  const topId = sortedMembers[0]?.id;

  // Group members into rows of 2 for grid layout
  const rows: MockMember[][] = [];
  for (let i = 0; i < sortedMembers.length; i += 2) {
    rows.push(sortedMembers.slice(i, i + 2));
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Sort pills */}
      <View
        style={{
          flexDirection: 'row-reverse',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        {(
          [
            { key: 'xp', label: S.sortByXP },
            { key: 'coins', label: S.sortByDonations },
            { key: 'reputation', label: 'מוניטין' },
          ] as { key: SortKey; label: string }[]
        ).map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => setSortKey(key)}
            accessibilityLabel={label}
            accessibilityRole="button"
            style={{
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 16,
              backgroundColor: sortKey === key ? CLAN.tierGold : 'rgba(255,255,255,0.08)',
              borderWidth: sortKey === key ? 0 : 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: sortKey === key ? '#0a1628' : 'rgba(255,255,255,0.7)',
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 12, paddingTop: 4 }}
      >
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row-reverse', gap: 8, marginBottom: 8 }}>
            {row.map((member, i) => (
              <MemberContributionCard
                key={member.id}
                member={member}
                isTopContributor={member.id === topId}
                selfReputation={selfReputation}
                onPress={(m) => setSelectedMember(m)}
                index={rowIdx * 2 + i}
              />
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </ScrollView>

      {/* Member detail modal */}
      <Modal
        visible={selectedMember !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMember(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setSelectedMember(null)}
        >
          <Pressable onPress={() => {}}>
            {selectedMember && (
              <View
                style={{
                  backgroundColor: '#1a3a5c',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 24,
                  gap: 16,
                }}
              >
                {/* Avatar + name */}
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 48 }}>{selectedMember.avatar}</Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: '900',
                      color: '#ffffff',
                      writingDirection: 'rtl',
                    }}
                  >
                    {selectedMember.name}
                  </Text>
                  <View
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: CLAN.tierGold, fontWeight: '700' }}>
                      {selectedMember.role === 'leader'
                        ? S.roleLeader
                        : selectedMember.role === 'deputy'
                        ? S.roleDeputy
                        : S.roleMember}
                    </Text>
                  </View>
                </View>

                {/* Stats */}
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-around' }}>
                  {[
                    {
                      label: 'XP',
                      value: selectedMember.xp.toLocaleString('he-IL'),
                      color: '#a78bfa',
                    },
                    {
                      label: '🪙',
                      value: selectedMember.coins.toLocaleString('he-IL'),
                      color: CLAN.tierGold,
                    },
                    {
                      label: 'מוניטין',
                      value: String(selectedMember.reputation),
                      color: '#4ade80',
                    },
                  ].map((stat) => (
                    <View key={stat.label} style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: stat.color }}>
                        {stat.value}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.5)',
                          writingDirection: 'rtl',
                        }}
                      >
                        {stat.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* CTAs — only for non-self */}
                {selectedMember.id !== SELF_ID && (
                  <View style={{ gap: 10 }}>
                    <Pressable
                      onPress={() => setSelectedMember(null)}
                      accessibilityLabel={S.sendDonation}
                      accessibilityRole="button"
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? '#15803d' : '#16a34a',
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: 'center',
                      })}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                        {S.sendDonation} 🎁
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedMember(null)}
                      accessibilityLabel={S.challengeToDuel}
                      accessibilityRole="button"
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? '#b91c1c' : '#ef4444',
                        borderRadius: 12,
                        paddingVertical: 12,
                        alignItems: 'center',
                      })}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#ffffff' }}>
                        {S.challengeToDuel}
                      </Text>
                    </Pressable>
                  </View>
                )}

                <Pressable
                  onPress={() => setSelectedMember(null)}
                  accessibilityLabel="סגור"
                  accessibilityRole="button"
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 14,
                      paddingVertical: 4,
                    }}
                  >
                    סגור
                  </Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
