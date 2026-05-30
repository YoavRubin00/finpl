import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

import { DAILY_CONCEPTS } from '../../daily-concepts/dailyConceptsData';
import { tapHaptic } from '../../../utils/haptics';
import { PEARL_STAGE_COLORS, pearlStageStyles } from './sharedStageStyles';

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
    <View style={pearlStageStyles.root}>
      <Animated.View entering={FadeIn.duration(220)} style={pearlStageStyles.card}>
        <View style={pearlStageStyles.labelRow}>
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
          <Text style={pearlStageStyles.label} allowFontScaling={false}>המושג היומי</Text>
        </View>

        <Text style={localStyles.title} allowFontScaling={false}>{concept.titleHe}</Text>
        <Text style={localStyles.body} allowFontScaling={false}>{concept.descriptionHe}</Text>
      </Animated.View>

      <View style={pearlStageStyles.ctaWrap}>
        <Pressable
          onPress={() => { tapHaptic(); onContinue(); }}
          style={pearlStageStyles.cta}
          accessibilityRole="button"
          accessibilityLabel="הבנתי, המשך לשלב הבא"
          disabled={!isActive}
        >
          <Text style={pearlStageStyles.ctaText} allowFontScaling={false}>הבנתי ←</Text>
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: PEARL_STAGE_COLORS.titleColor,
    writingDirection: 'rtl',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    fontWeight: '600',
    color: PEARL_STAGE_COLORS.bodyColor,
    writingDirection: 'rtl',
    textAlign: 'center',
    lineHeight: 25,
  },
});
