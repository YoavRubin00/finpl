import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Target, CheckCircle2 } from 'lucide-react-native';
import { FINN_HAPPY, FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { useMarketMissionStore } from './useMarketMissionStore';
import { successHaptic } from '../../utils/haptics';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

export function MarketMissionCard() {
  const mission = useMarketMissionStore((s) => s.todaysMission);
  const completed = useMarketMissionStore((s) => s.completedToday);
  const praiseShown = useMarketMissionStore((s) => s.praiseShownToday);
  const acknowledgePraise = useMarketMissionStore((s) => s.acknowledgePraise);

  // Celebrate the first render after completion flips to true.
  useEffect(() => {
    if (completed && !praiseShown) {
      successHaptic();
      acknowledgePraise();
    }
  }, [completed, praiseShown, acknowledgePraise]);

  if (!mission) return null;

  if (completed) {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.card, styles.cardDone]}
        accessibilityRole="text"
        accessibilityLabel={`סיימת את המשימה של היום. ${mission.sharkPraiseHe}`}
      >
        <ExpoImage source={FINN_HAPPY} style={styles.avatar} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <View style={styles.doneHeaderRow}>
            <CheckCircle2 size={16} color="#16a34a" strokeWidth={2.5} />
            <Text style={[RTL, styles.doneLabel]}>משימה הושלמה!</Text>
          </View>
          <Text style={[RTL, styles.donePraise]}>{mission.sharkPraiseHe}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <View
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={`משימה שוקית של היום: ${mission.titleHe}. ${mission.descriptionHe}`}
    >
      <ExpoImage source={FINN_STANDARD} style={styles.avatar} contentFit="contain" />
      <View style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          <Target size={14} color="#0284c7" strokeWidth={2.5} />
          <Text style={[RTL, styles.label]}>משימה שוקית של היום</Text>
        </View>
        <Text style={[RTL, styles.title]}>{mission.titleHe}</Text>
        <Text style={[RTL, styles.description]}>{mission.descriptionHe}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f0f9ff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 10,
  },
  cardDone: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  doneHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  doneLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16a34a',
  },
  donePraise: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 19,
  },
});
