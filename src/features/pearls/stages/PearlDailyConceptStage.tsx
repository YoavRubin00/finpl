import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

import { DAILY_CONCEPTS } from '../../daily-concepts/dailyConceptsData';
import { tapHaptic } from '../../../utils/haptics';

interface PearlDailyConceptStageProps {
  isActive: boolean;
  onContinue: () => void;
}

/** Deterministic per-day pick so every user globally sees the same concept
 *  on the same calendar day, and a different one every day. Mirrors the
 *  legacy FinFeedScreen `getDailyConcept`. */
function getDailyConcept() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return DAILY_CONCEPTS[dayIndex % DAILY_CONCEPTS.length];
}

export function PearlDailyConceptStage({ isActive, onContinue }: PearlDailyConceptStageProps): React.ReactElement {
  const concept = useMemo(() => getDailyConcept(), []);

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(220)} style={styles.card}>
        <View style={styles.labelRow}>
          <View accessible={false}>
            {/* concept.lottieSource is a JSON module id (number) — runtime
                accepts it via require(), but the typed source signature
                doesn't. Single-cast to LottieView's allowed shape. */}
            <LottieView
              source={concept.lottieSource as unknown as { uri: string }}
              style={{ width: 36, height: 36 }}
              autoPlay
              loop
            />
          </View>
          <Text style={styles.label} allowFontScaling={false}>המושג היומי</Text>
        </View>

        <Text style={styles.title} allowFontScaling={false}>{concept.titleHe}</Text>
        <Text style={styles.body} allowFontScaling={false}>{concept.descriptionHe}</Text>
      </Animated.View>

      <View style={styles.ctaWrap}>
        <Pressable
          onPress={() => { tapHaptic(); onContinue(); }}
          style={styles.cta}
          accessibilityRole="button"
          accessibilityLabel="המשך"
          disabled={!isActive}
        >
          <Text style={styles.ctaText} allowFontScaling={false}>המשך ←</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0f2fe',
    borderBottomWidth: 4,
    borderBottomColor: '#bae6fd',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    marginTop: 36,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369a1',
    letterSpacing: 1,
    writingDirection: 'rtl',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    writingDirection: 'rtl',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 25,
  },
  ctaWrap: {
    paddingHorizontal: 4,
  },
  cta: {
    backgroundColor: '#0891b2',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderBottomWidth: 4,
    borderBottomColor: '#0e7490',
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
});
