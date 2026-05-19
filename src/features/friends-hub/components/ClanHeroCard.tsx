import React from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useSquadsStore } from '../../social/useSquadsStore';
import { LEAGUE_GOLD, STITCH } from '../../../constants/theme';
import { FriendsCard } from '../shared/FriendsCard';
import { FriendsCardHeader } from '../shared/FriendsCardHeader';
import { FinnCue } from './FinnCue';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

export function ClanHeroCard(): React.ReactElement {
  const squad = useSquadsStore((s) => s.squad);
  const hasSquad = squad !== null;

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
      <FriendsCard
        accentColor={LEAGUE_GOLD.bgFrom}
        onPress={() => router.push('/clan')}
        accessibilityLabel={hasSquad ? `קלאן ${squad.name}` : 'הצטרף או צור קלאן'}
        accessibilityHint="לחץ לכניסה לעמוד הקלאן"
      >
        <FriendsCardHeader
          emoji={hasSquad ? '🛡️' : '⚔️'}
          badgeColor="#fef3c7"
          title={hasSquad ? squad.name : 'הקלאן שלך מחכה'}
          subtitle={
            hasSquad
              ? `${squad.members.length} חברים · טפח על הכרטיס`
              : 'צור קלאן או הצטרף לקיים'
          }
          trailing={
            <Text style={{ fontSize: 18, color: LEAGUE_GOLD.border, fontWeight: '900' }}>←</Text>
          }
        />
        <Text style={[{ fontSize: 12, color: STITCH.onSurfaceVariant, marginBottom: 4 }, RTL]}>
          {hasSquad
            ? 'הקלאן שלך פעיל. עזרו אחד לשני, צברו XP יחד.'
            : 'הצטרפו לקלאן או צרו חדש — שיתוף פעולה משתלם.'}
        </Text>
        <FinnCue
          variant={hasSquad ? 'happy' : 'hello'}
          text={
            hasSquad
              ? 'הקלאן שלך בעלייה — תמשיכו ככה'
              : 'בלי קלאן אתה בודד בשוק. בוא תמצא חבורה'
          }
          tone="gold"
        />
      </FriendsCard>
    </View>
  );
}
