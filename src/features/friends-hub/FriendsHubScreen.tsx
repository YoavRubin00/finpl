import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { STITCH, CLAN, DUO } from '../../constants/theme';
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

function PulseDot({ color }: { color: string }): React.ReactElement {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (reduced) return;
    scale.value = withRepeat(
      withTiming(1.4, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduced, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
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
              <PulseDot color={CLAN.donationGreen} />
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

        {/* ─── Community knowledge ─── */}
        <StaggeredEntry index={4}>
          <SectionLabel emoji="🌐" label="קהילת ידע" accentColor={STITCH.secondary} />
          <AnonAdviceHeroCard />
          <CrowdWisdomCard />
        </StaggeredEntry>

        {/* ─── Extras ─── */}
        <StaggeredEntry index={5}>
          <SectionLabel emoji="✨" label="עוד" accentColor={STITCH.secondaryPurple} />
          <SharkChatCard />
          <ReferralCard />
        </StaggeredEntry>
      </ScrollView>
    </SafeAreaView>
  );
}