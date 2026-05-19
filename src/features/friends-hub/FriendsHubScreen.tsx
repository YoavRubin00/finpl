import React, { useEffect } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { STITCH, CLAN, DUO } from '../../constants/theme';
import { useFriendsModeStore } from './useFriendsModeStore';
import { ActivityFeedStrip } from './components/ActivityFeedStrip';
import { ClanHeroCard } from './components/ClanHeroCard';
import { LeagueHeroCard } from './components/LeagueHeroCard';
import { FriendsLeaderboardCard } from './components/FriendsLeaderboardCard';
import { DuelsClashCard } from './components/DuelsClashCard';
import { FantasyLeagueCard } from './components/FantasyLeagueCard';
import { ReferralCard } from './components/ReferralCard';
import { SharkChatCard } from './components/SharkChatCard';
import { AnonAdviceHeroCard } from './components/AnonAdviceHeroCard';
import { CrowdWisdomCard } from './components/CrowdWisdomCard';
import { HotThisWeekCard } from './cards/HotThisWeekCard';
import { Ta35ForecastCard } from './cards/Ta35ForecastCard';
import { AnonymousPayslipCard } from './cards/AnonymousPayslipCard';
import { PulseDot } from './shared/PulseDot';

function SectionLabel({ emoji, label, accentColor }: { emoji: string; label: string; accentColor: string }) {
  return (
    <View
      style={{
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        gap: 10,
      }}
    >
      <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: accentColor }} />
      <Text
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: STITCH.onSurfaceVariant,
          letterSpacing: 0.4,
          writingDirection: 'rtl',
        }}
      >
        {emoji} {label}
      </Text>
    </View>
  );
}

function StaggeredEntry({ index, children }: { index: number; children: React.ReactNode }): React.ReactElement {
  const reduced = useReducedMotion();
  if (reduced) {
    return <View>{children}</View>;
  }
  return (
    <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index * 60, 600))}>
      {children}
    </Animated.View>
  );
}

export function FriendsHubScreen(): React.ReactElement {
  // Entering the Friends Hub flips the bottom tab bar to its Friends-Mode
  // variant (Home / Knowledge / Fantasy / Clan). The mode stays enabled
  // across navigations to /clan, /fantasy, /anon-advice, /crowd-wisdom and
  // exits only when the user taps "Home" or focuses a different global tab
  // (handled inside AnimatedTabBar).
  const enterFriendsMode = useFriendsModeStore((s) => s.enter);
  useEffect(() => {
    enterFriendsMode();
  }, [enterFriendsMode]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: STITCH.background }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ─── Clean Facebook-style header ─── */}
        <View
          style={{
            backgroundColor: '#ffffff',
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: STITCH.surfaceHighest,
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: DUO.blueSurface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 22 }}>👥</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 22,
                fontWeight: '900',
                color: STITCH.onSurface,
                writingDirection: 'rtl',
                textAlign: 'right',
                letterSpacing: -0.3,
              }}
            >
              חברים
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: STITCH.onSurfaceVariant,
                writingDirection: 'rtl',
                textAlign: 'right',
                marginTop: 1,
              }}
            >
              קלאנים · תחרויות · ליגות · קהילה
            </Text>
          </View>
        </View>

        {/* ─── Live activity pulse ─── */}
        <StaggeredEntry index={0}>
          <View style={{ marginBottom: 4 }}>
            <View
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                marginHorizontal: 16,
                marginBottom: 6,
                gap: 6,
              }}
            >
              <PulseDot size={7} color={CLAN.donationGreen} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: STITCH.onSurfaceVariant,
                  letterSpacing: 0.6,
                  writingDirection: 'rtl',
                }}
              >
                פעילות חיה
              </Text>
            </View>
            <ActivityFeedStrip />
          </View>
        </StaggeredEntry>

        {/* ─── Clan & League ─── */}
        <StaggeredEntry index={1}>
          <SectionLabel emoji="🛡️" label="קלאן וליגה" accentColor={CLAN.tierGold} />
          <ClanHeroCard />
          <LeagueHeroCard />
        </StaggeredEntry>

        {/* ─── Competitions ─── */}
        <StaggeredEntry index={2}>
          <SectionLabel emoji="⚔️" label="תחרויות" accentColor="#ea580c" />
          <DuelsClashCard />
          <FantasyLeagueCard />
        </StaggeredEntry>

        {/* ─── Leaderboard ─── */}
        <StaggeredEntry index={3}>
          <SectionLabel emoji="🏆" label="דירוג חברים" accentColor={STITCH.primary} />
          <FriendsLeaderboardCard />
        </StaggeredEntry>

        {/* ─── Group market intelligence (Robinhood-inspired) ─── */}
        <StaggeredEntry index={4}>
          <SectionLabel emoji="📊" label="מודיעין קבוצה" accentColor="#10b981" />
          <HotThisWeekCard />
          <Ta35ForecastCard />
          <AnonymousPayslipCard />
        </StaggeredEntry>

        {/* ─── Community knowledge ─── */}
        <StaggeredEntry index={5}>
          <SectionLabel emoji="🌐" label="קהילת ידע" accentColor={STITCH.secondary} />
          <AnonAdviceHeroCard />
          <CrowdWisdomCard />
        </StaggeredEntry>

        {/* ─── Extras ─── */}
        <StaggeredEntry index={6}>
          <SectionLabel emoji="✨" label="עוד" accentColor={STITCH.secondaryPurple} />
          <SharkChatCard />
          <ReferralCard />
        </StaggeredEntry>
      </ScrollView>
    </SafeAreaView>
  );
}