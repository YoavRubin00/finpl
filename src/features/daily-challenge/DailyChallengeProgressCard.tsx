import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { FINN_HAPPY, FINN_CHALLENGE } from '../retention-loops/finnMascotConfig';
import { useDailyChallengesStore } from '../daily-challenges/use-daily-challenges-store';
import { useDailyChallengeStore } from './useDailyChallengeStore';
import { getTodayGames, GAME_LABELS, GAME_EMOJIS } from './dailyChallengeConfig';
import type { GameKey } from './dailyChallengeConfig';
import { israelDayKey } from '../../utils/dateUtils';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

function useTodayGamePlays(): Record<GameKey, number> {
  const today = israelDayKey();
  return useDailyChallengesStore((s) => ({
    'higher-lower': s.higherLowerPlays[today] ?? 0,
    'bullshit-swipe': s.bullshitSwipePlays[today] ?? 0,
    'budget-ninja': s.budgetNinjaPlays[today] ?? 0,
    'price-slider': s.priceSliderPlays[today] ?? 0,
    'cashout-rush': s.cashoutRushPlays[today] ?? 0,
    'fomo-killer': s.fomoKillerPlays[today] ?? 0,
  }));
}

export function DailyChallengeProgressCard(): React.ReactElement {
  const reducedMotion = useReducedMotion();

  const plays = useTodayGamePlays();
  const hasChestGrantedToday = useDailyChallengeStore((s) => s.hasChestGrantedToday);
  const checkAndGrantChest = useDailyChallengeStore((s) => s.checkAndGrantChest);

  const games = getTodayGames();
  const completedGames = games.map((g) => plays[g] > 0);
  const completedCount = completedGames.filter(Boolean).length;
  const allDone = completedCount === 3;
  const chestGranted = hasChestGrantedToday();

  // Grant chest automatically when 3/3
  useEffect(() => {
    if (allDone && !chestGranted) {
      checkAndGrantChest();
    }
  }, [allDone, chestGranted, checkAndGrantChest]);

  // Pulse animation on the glow ring when there's progress to be made
  const glow = useSharedValue(0);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  useEffect(() => {
    if (allDone || reducedMotion) {
      glow.value = allDone ? 0.9 : 0;
      return;
    }
    if (completedCount === 0) {
      glow.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 1000 }), withTiming(0.15, { duration: 1000 })),
        -1,
        true,
      );
    } else {
      glow.value = 0.7;
    }
    return () => { glow.value = 0; };
  }, [completedCount, allDone, reducedMotion]);

  const mascot = allDone ? FINN_HAPPY : FINN_CHALLENGE;

  return (
    <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(400).delay(80)}>
      <LinearGradient
        colors={allDone ? ['#14532d', '#166534', '#15803d'] : ['#1e1b4b', '#1e3a5f', '#0c4a6e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Glow ring */}
        <Animated.View
          style={[
            styles.glowRing,
            { borderColor: allDone ? '#4ade80' : '#a5b4fc' },
            glowStyle,
          ]}
        />

        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow} allowFontScaling={false}>
              {allDone ? 'כל הכבוד — הושלם!' : 'האתגר היומי'}
            </Text>
            <Text style={[styles.title, RTL]} allowFontScaling={false}>
              אתגר השארק
            </Text>
          </View>
          <ExpoImage
            source={mascot}
            style={styles.mascot}
            contentFit="contain"
            accessible={false}
            pointerEvents="none"
          />
        </View>

        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {games.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, completedGames[i] ? styles.dotDone : styles.dotEmpty]}
            />
          ))}
        </View>

        {/* Game chips */}
        <View style={styles.chipsRow}>
          {games.map((game, i) => (
            <GameChip key={game} game={game} done={completedGames[i]} />
          ))}
        </View>

        {allDone && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText} allowFontScaling={false}>
              ארגז פרס נוסף לאוסף שלך 📦
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

function GameChip({ game, done }: { game: GameKey; done: boolean }): React.ReactElement {
  return (
    <View style={[styles.chip, done && styles.chipDone]}>
      <Text style={styles.chipEmoji} allowFontScaling={false}>
        {GAME_EMOJIS[game]}
      </Text>
      <Text style={[styles.chipLabel, done && styles.chipLabelDone]} allowFontScaling={false}>
        {GAME_LABELS[game]}
      </Text>
      {done && (
        <Text style={styles.chipCheck} allowFontScaling={false}>✓</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    color: '#a5b4fc',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  mascot: {
    width: 72,
    height: 72,
    marginLeft: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotDone: {
    backgroundColor: '#4ade80',
  },
  dotEmpty: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipDone: {
    backgroundColor: 'rgba(74,222,128,0.2)',
    borderColor: '#4ade80',
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  chipLabelDone: {
    color: '#4ade80',
  },
  chipCheck: {
    fontSize: 13,
    color: '#4ade80',
    fontWeight: '800',
    marginLeft: 2,
  },
  completedBanner: {
    marginTop: 12,
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  completedText: {
    color: '#86efac',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
