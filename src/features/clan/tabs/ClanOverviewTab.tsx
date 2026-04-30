import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useClanGoalsStore } from '../useClanGoalsStore';
import { useClanChatStore } from '../useClanChatStore';
import { useDonationsStore } from '../useDonationsStore';
import { useGroupBuyStore } from '../useGroupBuyStore';
import { MOCK_MEMBERS } from '../clanData';
import { CLAN } from '../../../constants/theme';
import { S } from '../strings';
import { SegmentedProgressBar } from '../components/SegmentedProgressBar';
import { WeeklyWarBanner } from '../components/WeeklyWarBanner';
import { ChestHeroCard } from '../components/ChestHeroCard';
import { ActivityFeedRow } from '../components/ActivityFeedRow';
import type { ClanChatSystemMessage } from '../clanTypes';

export function ClanOverviewTab(): React.ReactElement {
  const goals = useClanGoalsStore((s) => s.getGoals)();
  const progress = useClanGoalsStore((s) => s.getProgress)();
  const chestPoints = useClanGoalsStore((s) => s.getTotalChestPoints)();
  const maxPoints = useClanGoalsStore((s) => s.getMaxChestPoints)();
  const isChestReady = useClanGoalsStore((s) => s.isChestReady)();
  const isClaimed = useClanGoalsStore((s) => s.isChestClaimed)();
  const claimChest = useClanGoalsStore((s) => s.claimChest);
  const getGoalProgress = useClanGoalsStore((s) => s.getGoalProgress);

  const messages = useClanChatStore((s) => s.messages);
  const openRequests = useDonationsStore((s) => s.getOpenRequests)();
  const projects = useGroupBuyStore((s) => s.projects);

  const recentEvents: ClanChatSystemMessage[] = messages
    .filter((m): m is ClanChatSystemMessage => m.kind === 'system')
    .slice(-5)
    .reverse();

  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const memberCount = MOCK_MEMBERS.length;
  const requestsCount = openRequests.length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: 12 }}
    >
      {/* Weekly War */}
      <WeeklyWarBanner />

      {/* Chest hero */}
      <ChestHeroCard
        chestPoints={chestPoints}
        maxPoints={maxPoints}
        isReady={isChestReady}
        isClaimed={isClaimed}
        onClaim={claimChest}
      />

      {/* Quick stats strip */}
      <Animated.View
        entering={FadeInDown.delay(140).duration(280)}
        style={{
          marginHorizontal: 16,
          marginBottom: 14,
          flexDirection: 'row-reverse',
          backgroundColor: CLAN.cardBg,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          padding: 12,
          gap: 8,
        }}
      >
        {[
          { value: memberCount, label: 'חברים', color: '#a78bfa' },
          { value: requestsCount, label: 'תרומות', color: '#4ade80' },
          { value: activeProjectsCount, label: 'השקעות', color: CLAN.tierGoldLight },
        ].map((stat, i, arr) => (
          <React.Fragment key={stat.label}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', writingDirection: 'rtl' }}>
                {stat.label}
              </Text>
            </View>
            {i < arr.length - 1 && (
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
            )}
          </React.Fragment>
        ))}
      </Animated.View>

      {/* Activity feed */}
      {recentEvents.length > 0 && (
        <Animated.View
          entering={FadeInDown.delay(180).duration(280)}
          style={{ marginHorizontal: 16, marginBottom: 14 }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.5)',
              writingDirection: 'rtl',
              textAlign: 'right',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {S.activityFeed}
          </Text>
          <View
            style={{
              backgroundColor: CLAN.cardBg,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              paddingVertical: 4,
              paddingHorizontal: 10,
            }}
          >
            {recentEvents.map((event, i) => (
              <View key={event.id}>
                <ActivityFeedRow event={event} />
                {i < recentEvents.length - 1 && (
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                )}
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Weekly goals */}
      <Animated.View
        entering={FadeInDown.delay(220).duration(280)}
        style={{ marginHorizontal: 16, marginBottom: 16 }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: 'rgba(255,255,255,0.5)',
            writingDirection: 'rtl',
            textAlign: 'right',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
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
                entering={FadeInDown.delay(260 + i * 60).duration(260)}
                style={{
                  backgroundColor: CLAN.cardBg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: done ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)',
                  padding: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row-reverse',
                    alignItems: 'center',
                    marginBottom: 8,
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: '700',
                      color: done ? '#4ade80' : '#ffffff',
                      writingDirection: 'rtl',
                      textAlign: 'right',
                    }}
                  >
                    {done ? '✓ ' : ''}
                    {goal.labelHebrew}
                  </Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                    {current}/{goal.target}
                  </Text>
                </View>
                <SegmentedProgressBar
                  segments={[{ value: pct, color: done ? '#4ade80' : CLAN.tierGold }]}
                  height={6}
                />
                <Text
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: 5,
                    writingDirection: 'rtl',
                    textAlign: 'right',
                  }}
                >
                  פרס: {goal.rewardCoins} 🪙 · {goal.rewardGems} 💎 · {goal.rewardChestPoints} נק׳
                </Text>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    </ScrollView>
  );
}