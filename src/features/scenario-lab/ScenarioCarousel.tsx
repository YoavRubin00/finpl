import { FlatList, View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useEffect, useMemo, useCallback } from 'react';
import { SCENARIOS } from './scenarioLabData';
import { useScenarioLabStore } from './useScenarioLabStore';
import { tapHaptic } from '../../utils/haptics';

const CARD_WIDTH = 180;
const keyExtractor = (item: (typeof SCENARIOS)[number]) => item.id;
const nextCardShadow = { shadowColor: '#facc15', shadowRadius: 16, elevation: 8 } as const;

export function ScenarioCarousel() {
  const router = useRouter();
  const completedScenarios = useScenarioLabStore((s) => s.completedScenarios);
  const getBestGrade = useScenarioLabStore((s) => s.getBestGrade);

  // Gold glow for first uncompleted
  const glow = useSharedValue(0.3);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 }),
      ),
      -1,
      true,
    );
    return () => { cancelAnimation(glow); };
  }, [glow]);
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
  }));

  const firstUncompletedId = useMemo(
    () => SCENARIOS.find((sc) => !completedScenarios[sc.id])?.id,
    [completedScenarios],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: CARD_WIDTH + 12, offset: (CARD_WIDTH + 12) * index, index }),
    [],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 מעבדת התרחישים</Text>
      <FlatList
        data={SCENARIOS}
        horizontal
        inverted
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        windowSize={3}
        maxToRenderPerBatch={4}
        renderItem={({ item }) => {
          const grade = getBestGrade(item.id);
          const isCompleted = !!grade;
          const isNext = item.id === firstUncompletedId;

          return (
            <Pressable
              onPress={() => {
                tapHaptic();
                router.push(`/scenario-lab?id=${item.id}` as never);
              }}
            >
              <Animated.View
                style={[
                  styles.card,
                  isNext && nextCardShadow,
                  isNext && glowStyle,
                ]}
              >
                <LinearGradient
                  colors={[item.color + 'CC', item.color + '40', '#1e293b']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                />

                {/* Completed grade badge */}
                {isCompleted && (
                  <View style={styles.gradeBadge}>
                    <Text style={styles.gradeText}>{grade}</Text>
                  </View>
                )}

                {/* New tag */}
                {!isCompleted && (
                  <View style={styles.newTag}>
                    <Text style={styles.newTagText}>חדש!</Text>
                  </View>
                )}

                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

                {/* Difficulty */}
                <View style={styles.diffRow}>
                  {[1, 2, 3].map((d) => (
                    <Text key={d} style={{ fontSize: 10, opacity: d <= item.difficulty ? 1 : 0.3 }}>⭐</Text>
                  ))}
                </View>
              </Animated.View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: '#e0f2fe',
    writingDirection: 'rtl',
    textAlign: 'right',
    paddingHorizontal: 20,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  card: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
    padding: 14,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  emoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#f1f5f9',
    writingDirection: 'rtl',
    lineHeight: 20,
    marginBottom: 4,
  },
  diffRow: {
    flexDirection: 'row',
    gap: 2,
  },
  gradeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#facc15',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1035',
  },
  newTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
});
