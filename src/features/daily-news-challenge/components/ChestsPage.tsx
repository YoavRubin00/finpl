import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { CompletionChests } from './CompletionChests';
import { PerfectDayBurst } from './PerfectDayBurst';
import { ShareCard } from './ShareCard';
import type { ChallengeRewardSummary } from '../useDailyNewsChallengeStore';

interface ChestsPageProps {
  /** Width of the parent FlatList page — passed in so the page sizes match. */
  pageWidth?: number;
  unlocked: boolean;
  isPro: boolean;
  streak: number;
  perfect: boolean;
  regularOpened: boolean;
  proOpened: boolean;
  itemResults: [boolean | undefined, boolean | undefined];
  dateKey: string;
  onClaimRegular: () => ChallengeRewardSummary | null;
  onClaimPro: () => ChallengeRewardSummary | null;
  onUpgradePress?: () => void;
}

/**
 * Final page of the swipe-stack: dual chests + perfect-day burst + share card.
 * The share card only renders once BOTH chests are opened — we want the
 * reward dopamine to land first, then the social brag.
 */
export function ChestsPage({
  pageWidth,
  unlocked,
  isPro,
  streak,
  perfect,
  regularOpened,
  proOpened,
  itemResults,
  dateKey,
  onClaimRegular,
  onClaimPro,
  onUpgradePress,
}: ChestsPageProps): React.ReactElement {
  const bothChestsDone = regularOpened && (isPro ? proOpened : true);

  return (
    <View style={[styles.page, pageWidth ? { width: pageWidth } : null]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <PerfectDayBurst show={perfect && unlocked} />

        <CompletionChests
          unlocked={unlocked}
          isPro={isPro}
          streak={streak}
          regularOpened={regularOpened}
          proOpened={proOpened}
          onClaimRegular={onClaimRegular}
          onClaimPro={onClaimPro}
          onUpgradePress={onUpgradePress}
        />

        {bothChestsDone && (
          <Animated.View entering={FadeInUp.delay(400).duration(360).springify().damping(16)}>
            <ShareCard dateKey={dateKey} results={itemResults} streak={streak} />
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: perfectBurstTopPadding(),
    paddingBottom: 36,
    gap: 14,
  },
});

function perfectBurstTopPadding(): number {
  // Leave room for the absolute-positioned PerfectDayBurst badge (~76px tall).
  return 96;
}
