import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DUO } from '../../constants/theme';
import { ActivityFeedStrip } from './components/ActivityFeedStrip';
import { ClanHeroCard } from './components/ClanHeroCard';
import { LeagueHeroCard } from './components/LeagueHeroCard';
import { FriendsLeaderboardCard } from './components/FriendsLeaderboardCard';
import { DuelsClashCard } from './components/DuelsClashCard';
import { FantasyLeagueCard } from './components/FantasyLeagueCard';
import { ReferralCard } from './components/ReferralCard';
import { SharkChatCard } from './components/SharkChatCard';

export function FriendsHubScreen(): React.ReactElement {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DUO.bg }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: '900',
              color: '#191c1e',
              writingDirection: 'rtl',
              flex: 1,
              textAlign: 'right',
            }}
          >
            חברים
          </Text>
        </View>

        {/* Activity Feed */}
        <ActivityFeedStrip />

        {/* Section: קלאן */}
        <SectionTitle label="הקלאן שלך" />
        <ClanHeroCard />

        {/* Section: ליגה */}
        <SectionTitle label="ליגה שבועית" />
        <LeagueHeroCard />

        {/* Section: תחרויות */}
        <SectionTitle label="תחרויות" />
        <DuelsClashCard />

        {/* Section: פנטזי */}
        <SectionTitle label="פנטזיליג מניות" />
        <FantasyLeagueCard />

        {/* Section: לידרבורד */}
        <SectionTitle label="לוח תוצאות" />
        <FriendsLeaderboardCard />

        {/* Section: הזמן חברים */}
        <SectionTitle label="הזמן חברים" />
        <ReferralCard />

        {/* Section: שארק */}
        <SectionTitle label="קפטן שארק" />
        <SharkChatCard />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ label }: { label: string }): React.ReactElement {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
        writingDirection: 'rtl',
        textAlign: 'right',
        paddingHorizontal: 16,
        marginTop: 4,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </Text>
  );
}