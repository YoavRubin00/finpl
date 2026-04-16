import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { FINN_HAPPY, FINN_EMPATHIC } from '../../../retention-loops/finnMascotConfig';
import { LottieIcon } from '../../../../components/ui/LottieIcon';
import { AnimatedPressable } from '../../../../components/ui/AnimatedPressable';
import { ConfettiExplosion } from '../../../../components/ui/ConfettiExplosion';
import { SIM4, RTL, sim4Styles, GRADE_COLORS4, GRADE_HEBREW } from '../simTheme';
import { formatShekel } from '../../../../utils/format';
import type { StockOption, IndexRaceScore } from '../indexRaceTypes';
import { INDEX_RACE_LINE_COLORS as LINE_COLORS } from './indexRaceConstants';

const LOTTIE_CHART = require('../../../../../assets/lottie/wired-flat-153-bar-chart-hover-pinch.json');
const LOTTIE_BULB = require('../../../../../assets/lottie/wired-flat-36-bulb-hover-blink.json');
const LOTTIE_REPLAY = require('../../../../../assets/lottie/wired-flat-142-share-arrow-hover-slide.json');
const LOTTIE_ARROW = require('../../../../../assets/lottie/wired-flat-3381-arrows-left-hover-pointing.json');
const LOTTIE_ROCKET = require('../../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json');

interface IndexRaceScoreScreenProps {
  score: IndexRaceScore;
  selectedStocks: StockOption[];
  onReplay: () => void;
  onContinue: () => void;
}

export function IndexRaceScoreScreen({
  score,
  selectedStocks,
  onReplay,
  onContinue,
}: IndexRaceScoreScreenProps) {
  const [showConfetti, setShowConfetti] = useState(score.beatIndex);

  const diffSign = score.differencePercent >= 0 ? '+' : '';
  const diffColor = score.beatIndex ? SIM4.success : SIM4.danger;

  return (
    <ScrollView style={scoreStyles.scroll} contentContainerStyle={scoreStyles.scrollContent}>
      {showConfetti && (
        <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
      )}

      <Animated.View entering={FadeInDown.springify().damping(22)} style={sim4Styles.gradeContainer}>
        <Text accessibilityLiveRegion="polite" style={[sim4Styles.gradeText, { color: GRADE_COLORS4[score.grade] }]}>
          {score.grade}
        </Text>
        <Text style={sim4Styles.gradeLabel}>
          {GRADE_HEBREW[score.grade] ?? score.gradeLabel}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100)}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[scoreStyles.headline, RTL]}>
              {score.beatIndex ? 'ניצחת את המדד! 🏆' : 'המדד ניצח 📊'}
            </Text>

            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_ROCKET} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>התיק שלך</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: LINE_COLORS.portfolio }]}>
                {formatShekel(score.portfolioFinal)}
              </Text>
            </View>

            <View style={sim4Styles.scoreRow}>
              <View style={sim4Styles.scoreRowLeft}>
                <LottieIcon source={LOTTIE_CHART} size={18} />
                <Text style={[sim4Styles.scoreRowLabel, RTL]}>S&P 500</Text>
              </View>
              <Text style={[sim4Styles.scoreRowValue, { color: LINE_COLORS.index }]}>
                {formatShekel(score.indexFinal)}
              </Text>
            </View>

            <View style={sim4Styles.scoreDivider}>
              <Text style={[sim4Styles.scoreTotalLabel, RTL]}>הפרש</Text>
              <Text style={[sim4Styles.scoreTotalValue, { color: diffColor }]}>
                {diffSign}{score.differencePercent}%
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <Text style={[scoreStyles.breakdownTitle, RTL]}>הנכסים שבחרת</Text>
            {selectedStocks.map((stock) => (
              <View key={stock.id} style={scoreStyles.stockRow}>
                <View style={scoreStyles.stockIdChip}>
                  <Text style={scoreStyles.stockIdText}>{stock.id}</Text>
                </View>
                <Text style={[scoreStyles.stockName, RTL]}>{stock.name}</Text>
                <Text style={[scoreStyles.stockSector, RTL]}>{stock.sector}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300)} style={{ marginTop: 12 }}>
        <View style={sim4Styles.scoreCard}>
          <View style={sim4Styles.scoreCardInner}>
            <View style={sim4Styles.insightRow}>
              <LottieIcon source={LOTTIE_BULB} size={22} />
              <Text style={[sim4Styles.insightText, RTL, { flex: 1 }]}>
                92% ממנהלי ההשקעות המקצועיים לא מצליחים לנצח את המדד לאורך 15 שנה. קרן מחקה מדד היא לרוב הבחירה החכמה.
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400)} style={sharkStyles.wrap}>
        <ExpoImage
          source={score.beatIndex ? FINN_HAPPY : FINN_EMPATHIC}
          style={sharkStyles.finn}
          contentFit="contain"
        />
        <View style={sharkStyles.bubble}>
          <Text style={[sharkStyles.title, RTL]}>קפטן שארק בסיכום 🦈</Text>
          <Text style={[sharkStyles.body, RTL]}>
            {score.beatIndex
              ? `כל הכבוד! נכנסת לעשור 2011–2020 והצלחת לעקוף את ה-S&P 500 (שעלה 251% בעשור). רוב המשקיעים לא מצליחים. אבל שים לב: התוצאה גם תלויה בנכסים שבחרת — ביטקוין ועליות טכנולוגיה של העשור ההוא היו אנומליה היסטורית.`
              : `המדד ניצח — וזה בסדר גמור. S&P 500 הניב כ-251% בעשור 2011–2020 (13% שנתי ממוצע). אפילו מנהלי קרנות מקצועיים נופלים על המספר הזה. הרבה יותר חכם לקנות את המדד עצמו מאשר לנסות לבחור מניות.`}
          </Text>
          <Text style={[sharkStyles.footnote, RTL]}>
            * התוצאות מבוססות על תשואות שנתיות היסטוריות אמיתיות 2011–2020 (S&P 500, Apple, NVIDIA, Amazon, Microsoft, Alphabet, QQQ, ת"א 125, ביטקוין, אתריום וזהב).
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400)} style={sim4Styles.actionsRow}>
        <AnimatedPressable onPress={onReplay} style={sim4Styles.replayBtn} accessibilityRole="button" accessibilityLabel="שחק שוב">
          <View accessible={false}><LottieIcon source={LOTTIE_REPLAY} size={18} /></View>
          <Text style={sim4Styles.replayText}>שחק שוב</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onContinue} style={sim4Styles.continueBtn} accessibilityRole="button" accessibilityLabel="המשך">
          <Text style={sim4Styles.continueText}>המשך</Text>
          <View accessible={false}><LottieIcon source={LOTTIE_ARROW} size={22} /></View>
        </AnimatedPressable>
      </Animated.View>
    </ScrollView>
  );
}

const scoreStyles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },
  headline: {
    fontSize: 20,
    fontWeight: '900',
    color: SIM4.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  breakdownTitle: {
    color: SIM4.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stockIdChip: {
    backgroundColor: '#0c4a6e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stockIdText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stockName: {
    fontSize: 14,
    fontWeight: '700',
    color: SIM4.textPrimary,
    flex: 1,
  },
  stockSector: {
    fontSize: 12,
    fontWeight: '600',
    color: SIM4.textMuted,
  },
});

const sharkStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 14,
    backgroundColor: 'rgba(14,165,233,0.08)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.25)',
    padding: 12,
  },
  finn: { width: 72, height: 72, flexShrink: 0 },
  bubble: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: '900', color: '#0369a1' },
  body: { fontSize: 13, color: '#0c4a6e', lineHeight: 20, fontWeight: '600' },
  footnote: { fontSize: 10.5, color: '#64748b', fontWeight: '500', marginTop: 6, fontStyle: 'italic' },
});
