import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Users, Edit3, ChevronLeft } from 'lucide-react-native';

import { tapHaptic } from '../../utils/haptics';
import { FriendsLeaderboardCard } from './components/FriendsLeaderboardCard';
import { ReferralCard } from './components/ReferralCard';
import { AnonAdviceHeroCard } from './components/AnonAdviceHeroCard';
import { CrowdWisdomCard } from './components/CrowdWisdomCard';
import { HotThisWeekCard } from './cards/HotThisWeekCard';
import { Ta35ForecastCard } from './cards/Ta35ForecastCard';
import { PremiumFantasyButton } from './components/PremiumFantasyButton';
import { PortfolioShareCard } from './components/PortfolioShareCard';
import { TradeRoomsCard } from './components/TradeRoomsCard';
import { FriendsListButton } from './components/FriendsListButton';
import { FriendsHubTutorialMount } from './components/FriendsHubTutorialMount';

// ─── Facebook-feed palette (light, social-first) ─────────────────────
const FEED_BG = '#f3f4f6';
const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const FB_BLUE = '#1877f2';

function FeedDivider(): React.ReactElement {
  return <View style={{ height: 8, backgroundColor: FEED_BG }} />;
}

function StaggeredEntry({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}): React.ReactElement {
  const reduced = useReducedMotion();
  if (reduced) {
    return <View>{children}</View>;
  }
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(Math.min(index * 50, 500))}>
      {children}
    </Animated.View>
  );
}

function Composer({ onPress }: { onPress: () => void }): React.ReactElement {
  return (
    <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 10 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="פתחו שאלה לקהילה בחדרי המסחר"
        style={({ pressed }) => ({
          backgroundColor: pressed ? '#f8fafc' : '#ffffff',
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: '#dbeafe',
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row-reverse',
          alignItems: 'center',
          gap: 10,
          shadowColor: '#1877f2',
          shadowOpacity: 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        })}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: '#e0f2fe',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Edit3 size={17} color={FB_BLUE} strokeWidth={2.4} />
        </View>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
          style={{
            flex: 1,
            flexShrink: 1,
            fontSize: 14,
            fontWeight: '600',
            color: TEXT_MUTED,
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          מה דעתכם על השוק היום?
        </Text>
        <ChevronLeft size={18} color="#9ca3af" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

export function FriendsHubScreen(): React.ReactElement {
  const router = useRouter();

  const handleComposerPress = React.useCallback(() => {
    tapHaptic();
    router.push('/trade-rooms' as never);
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FEED_BG }} edges={[]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ─── Header: title + premium buttons ─── */}
        <View
          style={{
            backgroundColor: '#ffffff',
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 14,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#e0f2fe',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={20} color={FB_BLUE} strokeWidth={2.4} />
          </View>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
            style={{
              flex: 1,
              flexShrink: 1,
              fontSize: 22,
              fontWeight: '900',
              color: TEXT_PRIMARY,
              writingDirection: 'rtl',
              textAlign: 'right',
              letterSpacing: -0.3,
            }}
          >
            חברים
          </Text>
          <FriendsListButton />
          <PremiumFantasyButton variant="compact" />
        </View>

        <FeedDivider />

        {/* ─── Composer: tap → talk markets in the trade rooms ─── */}
        <Composer onPress={handleComposerPress} />

        <FeedDivider />

        {/* ─── Trade rooms strip — the social heart of the hub ─── */}
        <StaggeredEntry index={0}>
          <View style={{ backgroundColor: '#ffffff' }}>
            <TradeRoomsCard />
          </View>
        </StaggeredEntry>

        <FeedDivider />

        {/* ─── Pinned premium hero: Fantasy League ─── */}
        <StaggeredEntry index={0}>
          <View style={{ backgroundColor: '#ffffff', paddingVertical: 4 }}>
            <PremiumFantasyButton variant="hero" />
          </View>
        </StaggeredEntry>

        <FeedDivider />

        {/* ─── Feed posts ─── */}
        <StaggeredEntry index={1}>
          <View style={{ backgroundColor: '#ffffff' }}>
            <HotThisWeekCard />
          </View>
        </StaggeredEntry>

        <FeedDivider />

        <StaggeredEntry index={2}>
          <View style={{ backgroundColor: '#ffffff' }}>
            <Ta35ForecastCard />
          </View>
        </StaggeredEntry>

        <FeedDivider />

        <StaggeredEntry index={3}>
          <View style={{ backgroundColor: '#ffffff' }}>
            <CrowdWisdomCard />
          </View>
        </StaggeredEntry>

        <FeedDivider />

        <StaggeredEntry index={5}>
          <View style={{ backgroundColor: '#ffffff' }}>
            <AnonAdviceHeroCard />
          </View>
        </StaggeredEntry>

        <FeedDivider />

        <StaggeredEntry index={6}>
          <View style={{ backgroundColor: '#ffffff' }}>
            <FriendsLeaderboardCard />
          </View>
        </StaggeredEntry>

        <FeedDivider />

        <StaggeredEntry index={8}>
          <View style={{ backgroundColor: '#ffffff' }}>
            <ReferralCard />
          </View>
        </StaggeredEntry>

        <FeedDivider />

        {/* ─── Portfolio sharing feed — bottom of hub ─── */}
        <StaggeredEntry index={9}>
          <PortfolioShareCard />
        </StaggeredEntry>
      </ScrollView>

      {/* First-visit Captain Shark tour — absolute overlay, must be a
          sibling of the ScrollView so it anchors to the full screen. */}
      <FriendsHubTutorialMount />
    </SafeAreaView>
  );
}
