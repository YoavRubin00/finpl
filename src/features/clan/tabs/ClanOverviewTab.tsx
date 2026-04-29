import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useClanGoalsStore } from '../useClanGoalsStore';
import { useEconomyStore } from '../../economy/useEconomyStore';
import { MOCK_MEMBERS, SELF_ID } from '../clanData';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';
import { SegmentedProgressBar } from '../components/SegmentedProgressBar';
import { MemberRow } from '../components/MemberRow';
import type { MockMember } from '../clanData';

export function ClanOverviewTab(): React.ReactElement {
  const goals = useClanGoalsStore((s) => s.getGoals)();
  const progress = useClanGoalsStore((s) => s.getProgress)();
  const chestPoints = useClanGoalsStore((s) => s.getTotalChestPoints)();
  const maxPoints = useClanGoalsStore((s) => s.getMaxChestPoints)();
  const isChestReady = useClanGoalsStore((s) => s.isChestReady)();
  const isClaimed = useClanGoalsStore((s) => s.isChestClaimed)();
  const claimChest = useClanGoalsStore((s) => s.claimChest);
  const getGoalProgress = useClanGoalsStore((s) => s.getGoalProgress);

  const topContributors = [...MOCK_MEMBERS].sort((a, b) => b.xp - a.xp).slice(0, 3);

  function handleClaimChest(): void {
    claimChest();
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
    >
      {/* Clan Chest */}
      <Animated.View entering={FadeInDown.duration(300)} style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <View
          style={{
            backgroundColor: CLAN.cardBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isChestReady ? CLAN.tierGold : 'rgba(255,255,255,0.1)',
            padding: 16,
          }}
        >
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12, gap: 10 }}>
            <Text style={{ fontSize: 28 }}>🎁</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>
                {S.clanChest}
              </Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl' }}>
                {isClaimed ? S.claimedThisWeek : isChestReady ? S.chestReady : S.weeklyGoalsSubtitle}
              </Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: isChestReady ? CLAN.tierGoldLight : 'rgba(255,255,255,0.5)' }}>
              {S.chestProgress(chestPoints, maxPoints)}
            </Text>
          </View>

          <SegmentedProgressBar
            segments={[{ value: chestPoints / maxPoints, color: CLAN.tierGold }]}
            height={10}
          />

          {isChestReady && (
            <Pressable
              onPress={handleClaimChest}
              style={({ pressed }) => ({
                marginTop: 12,
                backgroundColor: pressed ? CLAN.tierGold : CLAN.tierGoldLight,
                borderRadius: 12,
                paddingVertical: 10,
                alignItems: 'center',
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#0a1628' }}>
                {S.claimChest} 🎁
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Weekly Goals */}
      <Animated.View entering={FadeInDown.delay(60).duration(300)} style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl', textAlign: 'right', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {S.weeklyGoals}
        </Text>
        <View style={{ gap: 10 }}>
          {goals.map((goal, i) => {
            const current = getGoalProgress(goal.id);
            const pct = Math.min(1, current / goal.target);
            const done = progress.completedGoalIds.includes(goal.id);
            return (
              <Animated.View
                key={goal.id}
                entering={FadeInDown.delay(100 + i * 60).duration(260)}
                style={{
                  backgroundColor: CLAN.cardBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: done ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)',
                  padding: 12,
                }}
              >
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: done ? '#4ade80' : '#ffffff', writingDirection: 'rtl', textAlign: 'right' }}>
                    {done ? '✓ ' : ''}{goal.labelHebrew}
                  </Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    {current}/{goal.target}
                  </Text>
                </View>
                <SegmentedProgressBar
                  segments={[{ value: pct, color: done ? '#4ade80' : CLAN.tierGold }]}
                  height={6}
                />
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, writingDirection: 'rtl', textAlign: 'right' }}>
                  פרס: {goal.rewardCoins} 🪙  {goal.rewardGems} 💎
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      {/* Top Contributors */}
      <Animated.View entering={FadeInDown.delay(240).duration(300)} style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', writingDirection: 'rtl', textAlign: 'right', marginBottom: 8, marginHorizontal: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {S.topContributors}
        </Text>
        {topContributors.map((member, i) => (
          <MemberRow
            key={member.id}
            member={member as MockMember}
            rank={i + 1}
            onPress={() => {}}
            index={i}
          />
        ))}
      </Animated.View>
    </ScrollView>
  );
}
