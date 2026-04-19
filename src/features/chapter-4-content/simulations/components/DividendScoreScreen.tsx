import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AnimatedPressable } from '../../../../components/ui/AnimatedPressable';
import { GlowCard } from '../../../../components/ui/GlowCard';
import { ConfettiExplosion } from '../../../../components/ui/ConfettiExplosion';
import { LottieIcon } from '../../../../components/ui/LottieIcon';
import { SIM4, RTL, sim4Styles } from '../simTheme';
import { formatShekel } from '../../../../utils/format';
import { useDividendTree } from '../useDividendTree';
import { DIVIDEND_COLORS as COLORS } from './dividendTreeConstants';

const LOTTIE_TREE = require('../../../../../assets/lottie/wired-flat-443-tree-hover-pinch.json');
const LOTTIE_BULB = require('../../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_TARGET = require('../../../../../assets/lottie/wired-flat-458-goal-target-hover-hit.json');
const LOTTIE_REPLAY = require('../../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_GROWTH = require('../../../../../assets/lottie/wired-flat-161-growth-hover-pinch.json');
const LOTTIE_DECREASE = require('../../../../../assets/lottie/wired-flat-162-decrease-hover-pinch.json');
const LOTTIE_ARROW = require('../../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');

interface DividendScoreScreenProps {
  score: NonNullable<ReturnType<typeof useDividendTree>['score']>;
  onReplay: () => void;
  onContinue: () => void;
}

export function DividendScoreScreen({ score, onReplay, onContinue }: DividendScoreScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  const multiplier = score.plantTotal / score.eatTotal;
  const diffPercent = ((score.difference / score.eatTotal) * 100).toFixed(0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      <Animated.View entering={FadeInDown.springify().damping(22)} style={sim4Styles.gradeContainer}>
        <View accessible={false}><LottieIcon source={LOTTIE_TREE} size={56} /></View>
        <Text accessibilityLiveRegion="polite" style={[sim4Styles.gradeText, { color: COLORS.gold }]}>
          פי {multiplier.toFixed(1)}
        </Text>
        <Text style={[sim4Styles.gradeLabel, { color: COLORS.gold }]}>
          יתרון השתילה מחדש
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100)}>
        <GlowCard glowColor="rgba(212,175,55,0.15)" style={{ ...styles.statsCard, backgroundColor: SIM4.cardBg }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <LottieIcon source={LOTTIE_DECREASE} size={22} />
            <Text style={[styles.statsTitle, { textAlign: 'center' }]}>אכלת דיבידנדים vs</Text>
            <LottieIcon source={LOTTIE_GROWTH} size={22} />
            <Text style={[styles.statsTitle, { textAlign: 'center' }]}>שתלת מחדש</Text>
          </View>
          <View style={scoreStyles.comparisonRow}>
            <View style={scoreStyles.comparisonCol}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_DECREASE} size={18} />
                <Text style={scoreStyles.comparisonLabel}>אכלת</Text>
              </View>
              <Text style={[scoreStyles.comparisonValue, { color: COLORS.red }]}>
                {formatShekel(score.eatTotal)}
              </Text>
              <Text style={scoreStyles.comparisonSub}>(שווי + דיבידנדים)</Text>
            </View>
            <View style={scoreStyles.vsBox}>
              <Text style={scoreStyles.vsText}>VS</Text>
            </View>
            <View style={scoreStyles.comparisonCol}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <LottieIcon source={LOTTIE_GROWTH} size={18} />
                <Text style={scoreStyles.comparisonLabel}>שתלת</Text>
              </View>
              <Text style={[scoreStyles.comparisonValue, { color: COLORS.gold }]}>
                {formatShekel(score.plantTotal)}
              </Text>
              <Text style={scoreStyles.comparisonSub}>(הכל בעץ)</Text>
            </View>
          </View>
        </GlowCard>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200)}>
        <GlowCard glowColor="rgba(34,197,94,0.15)" style={{ ...styles.statsCard, backgroundColor: SIM4.cardBg }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            <LottieIcon source={LOTTIE_BULB} size={22} />
            <Text style={[styles.statsTitle, RTL]}>ההבדל</Text>
          </View>
          <Text style={scoreStyles.differenceText}>
            אכלת {formatShekel(score.eatTotal)} סה״כ דיבידנדים + שווי.
          </Text>
          <Text style={scoreStyles.differenceText}>
            אם היית שותל, היה לך {formatShekel(score.plantTotal)} (פי {multiplier.toFixed(1)} יותר!)
          </Text>
          <Text style={scoreStyles.differenceHighlight}>
            הפרש: +{formatShekel(score.difference)} ({diffPercent}% יותר)
          </Text>
        </GlowCard>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300)}>
        <GlowCard glowColor="rgba(212,175,55,0.15)" style={{ ...styles.statsCard, backgroundColor: SIM4.cardBg }}>
          <View style={sim4Styles.insightRow}>
            <LottieIcon source={LOTTIE_TARGET} size={22} />
            <Text style={[sim4Styles.insightText, { flex: 1 }]}>
              דיבידנד שמחזירים לעץ = ריבית דריבית על סטרואידים.
            </Text>
          </View>
        </GlowCard>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(500)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} accessibilityRole="button" accessibilityLabel="שחק שוב" style={sim4Styles.replayBtn}>
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim4Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} accessibilityRole="button" accessibilityLabel="המשך" style={sim4Styles.continueBtn}>
          <Text style={sim4Styles.continueText}>המשך</Text>
          <View style={{ position: 'absolute', left: 16 }} accessible={false}>
            <LottieIcon source={LOTTIE_ARROW} size={22} />
          </View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SIM4.cardBg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    marginTop: 12,
    padding: 16,
    backgroundColor: SIM4.cardBg,
  },
  statsTitle: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
});

const scoreStyles = StyleSheet.create({
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  comparisonCol: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonLabel: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  comparisonSub: {
    color: SIM4.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  vsBox: {
    width: 40,
    alignItems: 'center',
  },
  vsText: {
    color: SIM4.textMuted,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  differenceText: {
    color: SIM4.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    ...RTL,
  },
  differenceHighlight: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
});
