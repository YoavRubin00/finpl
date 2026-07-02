import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Users, Edit3, UserPlus } from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';
import { useFriendsStore } from '../friends/useFriendsStore';

import { tapHaptic } from '../../utils/haptics';
import { ActivityFeedStrip } from './components/ActivityFeedStrip';
import { FriendsLeaderboardCard } from './components/FriendsLeaderboardCard';
import { ReferralCard } from './components/ReferralCard';
import { AnonAdviceHeroCard } from './components/AnonAdviceHeroCard';
import { CrowdWisdomCard } from './components/CrowdWisdomCard';
import { HotThisWeekCard } from './cards/HotThisWeekCard';
import { Ta35ForecastCard } from './cards/Ta35ForecastCard';
import { PremiumFantasyButton } from './components/PremiumFantasyButton';
import { PortfolioShareCard } from './components/PortfolioShareCard';
import { TradeRoomsCard } from './components/TradeRoomsCard';
import { FriendsHubTutorialMount } from './components/FriendsHubTutorialMount';
import { FANTASY_ACTIVE_FRIENDS } from '../fantasy-league/fantasyData';

// ─── Facebook-feed palette (light, social-first) ─────────────────────
const FEED_BG = '#f3f4f6';
const TEXT_PRIMARY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const COMPOSER_BG = '#ffffff';
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="פתח שאלה לקהילה"
      style={({ pressed }) => ({
        backgroundColor: COMPOSER_BG,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.95 : 1,
      })}
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
        <Edit3 size={18} color={FB_BLUE} strokeWidth={2.4} />
      </View>
      <View
        style={{
          flex: 1,
          backgroundColor: FEED_BG,
          borderRadius: 999,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: TEXT_MUTED,
            writingDirection: 'rtl',
            textAlign: 'right',
          }}
        >
          מה אתה חושב על השוק היום?
        </Text>
      </View>
    </Pressable>
  );
}

export function FriendsHubScreen(): React.ReactElement {
  const router = useRouter();
  const friendIds = useFriendsStore(useShallow((s) => s.friendIds));

  const handleComposerPress = React.useCallback(() => {
    tapHaptic();
    router.push('/trade-rooms' as never);
  }, [router]);

  const openFriendsList = React.useCallback(() => {
    tapHaptic();
    router.push('/friends-list' as never);
  }, [router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FEED_BG }} edges={[]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ─── Header: title + premium Fantasy chip ─── */}
        <View
          style={{
            backgroundColor: '#ffffff',
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 14,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 12,
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
            style={{
              flex: 1,
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
          <Pressable
            onPress={openFriendsList}
            accessibilityRole="button"
            accessibilityLabel="החברים שלך"
            style={({ pressed }) => ({
              flexDirection: 'row-reverse',
              alignItems: 'center',
              gap: 5,
              backgroundColor: '#e0f2fe',
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 8,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <UserPlus size={15} color={FB_BLUE} strokeWidth={2.6} />
            <Text style={{ fontSize: 12, fontWeight: '900', color: FB_BLUE }}>
              החברים שלך{friendIds.length > 0 ? ` · ${friendIds.length}` : ''}
            </Text>
          </Pressable>
          <PremiumFantasyButton variant="compact" activeFriends={FANTASY_ACTIVE_FRIENDS} />
        </View>

        {/* ─── Story strip: live activity ─── */}
        <View style={{ backgroundColor: '#ffffff', paddingTop: 4, paddingBottom: 10 }}>
          <ActivityFeedStrip />
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
            <PremiumFantasyButton variant="hero" activeFriends={FANTASY_ACTIVE_FRIENDS} />
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
