import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useGroupBuyStore } from './useGroupBuyStore';
import { MOCK_MEMBERS, SELF_ID } from './clanData';
import { CLAN } from '../../constants/theme';
import { S } from './strings';
import { SegmentedProgressBar } from './components/SegmentedProgressBar';
import { GoldRibbon } from './components/GoldRibbon';

interface GroupBuyProjectScreenProps {
  projectId: string;
}

export function GroupBuyProjectScreen({ projectId }: GroupBuyProjectScreenProps): React.ReactElement {
  const getProjectById = useGroupBuyStore((s) => s.getProjectById);
  const getSelfShare = useGroupBuyStore((s) => s.getSelfShare);
  const canClaimPayout = useGroupBuyStore((s) => s.canClaimPayout);
  const claimPayout = useGroupBuyStore((s) => s.claimPayout);
  const ownedAssets = useGroupBuyStore((s) => s.ownedAssets);

  const project = getProjectById(projectId);
  const asset = ownedAssets.find((a) => a.sourceProjectId === projectId);

  if (!project) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: CLAN.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#ffffff', fontSize: 16 }}>הפרויקט לא נמצא</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: CLAN.tierGoldLight, fontSize: 14 }}>חזור</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const pct = project.goalAmount > 0 ? project.raisedAmount / project.goalAmount : 0;
  const selfShare = getSelfShare(projectId);
  const isFunded = project.status === 'funded';
  const canClaim = asset ? canClaimPayout(asset.id) : false;
  const contributors = MOCK_MEMBERS.filter((m) => project.contributorIds.includes(m.id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: CLAN.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#ffffff', fontSize: 18 }}>→</Text>
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right' }} numberOfLines={1}>
          {project.emoji} {project.name}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}>
        {/* Hero card */}
        <View style={{ backgroundColor: CLAN.cardBg, borderRadius: 16, borderWidth: isFunded ? 1.5 : 1, borderColor: isFunded ? CLAN.tierGold : 'rgba(255,255,255,0.1)', padding: 16, marginBottom: 16, overflow: 'hidden', position: 'relative' }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 56 }}>{project.emoji}</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl', marginTop: 8 }}>
              {project.name}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', writingDirection: 'rtl', textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
              {project.descriptionHebrew}
            </Text>
          </View>

          <SegmentedProgressBar segments={[{ value: pct, color: isFunded ? CLAN.tierGold : CLAN.donationGreen }]} height={10} />

          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' }}>
              {project.raisedAmount.toLocaleString('he-IL')} / {project.goalAmount.toLocaleString('he-IL')}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: isFunded ? CLAN.tierGoldLight : '#4ade80' }}>
              {Math.round(pct * 100)}% {isFunded ? '✓' : ''}
            </Text>
          </View>

          {isFunded && <GoldRibbon label="מומן! 🏆" />}
        </View>

        {/* Daily yield */}
        <View style={{ backgroundColor: CLAN.cardBg, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl', textAlign: 'right', marginBottom: 10 }}>
            {S.passiveIncome}
          </Text>
          <View style={{ flexDirection: 'row-reverse', gap: 16 }}>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: CLAN.tierGoldLight }}>{project.dailyYieldCoins} 🪙</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', writingDirection: 'rtl' }}>מטבעות ליום</Text>
            </View>
            {project.dailyYieldGems > 0 && (
              <View style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#c4b5fd' }}>{project.dailyYieldGems} 💎</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', writingDirection: 'rtl' }}>ג'מים ליום</Text>
              </View>
            )}
            {selfShare > 0 && (
              <View style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#4ade80' }}>{Math.round(selfShare * 100)}%</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', writingDirection: 'rtl' }}>החלק שלך</Text>
              </View>
            )}
          </View>
        </View>

        {/* Contributors */}
        {contributors.length > 0 && (
          <View style={{ backgroundColor: CLAN.cardBg, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14, marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl', textAlign: 'right', marginBottom: 10 }}>
              תורמים ({contributors.length})
            </Text>
            {contributors.map((m) => (
              <View key={m.id} style={{ flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ fontSize: 22 }}>{m.avatar}</Text>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#ffffff', writingDirection: 'rtl', textAlign: 'right' }}>
                  {m.name}
                </Text>
                {m.id === SELF_ID && selfShare > 0 && (
                  <Text style={{ fontSize: 12, color: '#4ade80', fontWeight: '700' }}>
                    {Math.round(selfShare * 100)}%
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      {isFunded && asset && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: CLAN.bg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
          <Pressable
            onPress={() => claimPayout(asset.id)}
            disabled={!canClaim}
            style={({ pressed }) => ({
              backgroundColor: canClaim ? (pressed ? CLAN.tierGold : CLAN.tierGoldLight) : 'rgba(255,255,255,0.1)',
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '900', color: canClaim ? '#0a1628' : 'rgba(255,255,255,0.3)', writingDirection: 'rtl' }}>
              {canClaim ? `${S.claimPayout} 💰` : S.claimedToday}
            </Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
