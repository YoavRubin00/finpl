import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Check, X as XIcon, Sparkles } from 'lucide-react-native';

import { tapHaptic, successHaptic } from '../../../utils/haptics';
import { FINN_DANCING, FINN_HAPPY } from '../../retention-loops/finnMascotConfig';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { STITCH } from '../../../constants/theme';
import { previewRegularReward, previewProReward, type ChallengeRewardSummary } from '../useDailyNewsChallengeStore';
import type { ChallengeItem } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');

interface RecapCardProps {
  /** Whether the parent FlatList has assigned this page its full width. */
  pageWidth: number;
  /** The 2 questions the user just answered. */
  items: [ChallengeItem, ChallengeItem];
  /** Was each answer correct? (`undefined` shouldn't happen here — recap only shown after both answered.) */
  results: [boolean | undefined, boolean | undefined];
  /** Current streak from the global useStreak hook. */
  streak: number;
  /** True if user has Pro subscription — affects which reward preview is shown. */
  isPro: boolean;
  /** Called when the user taps the CTA. Parent should run claim + close. */
  onContinue: () => void;
}

/**
 * Final page of the news challenge — Duolingo-style recap that turns the
 * silent close into a memorable "you did it" moment. Lists what was learned,
 * shows rewards, the live streak, and frames tomorrow as the next visit
 * ("חוזרים מחר באותו זמן").
 *
 * Voice: Captain Shark, singular gender-neutral per docs/BRAND.md.
 *
 * Wrapped in ScrollView so tall content (large text on small phones, landscape
 * iPhones, web wide-but-short viewports) never gets cut off — user explicitly
 * asked the design not to overflow.
 */
export function RecapCard({
  pageWidth,
  items,
  results,
  streak,
  isPro,
  onContinue,
}: RecapCardProps): React.ReactElement {
  const both = results[0] === true && results[1] === true;
  const reward = useMemo<ChallengeRewardSummary>(() => {
    // Same calc the chest claim flow uses — shown here as a transparent preview
    // so the user sees what they earned BEFORE the auto-claim on CTA tap.
    if (isPro) return previewProReward(streak, both);
    return previewRegularReward(streak, both);
  }, [isPro, streak, both]);

  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  useEffect(() => {
    if (both) successHaptic();
  }, [both]);

  const handlePress = () => {
    tapHaptic();
    onContinue();
  };

  // Short-form recap of each item: trim long headlines so two cards stack
  // comfortably on a 360px-wide phone without truncating awkwardly.
  const shortHeadline = (h: string): string => {
    if (h.length <= 60) return h;
    return h.slice(0, 58).trimEnd() + '…';
  };

  return (
    <View style={[styles.page, { width: pageWidth }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mascot + headline */}
        <Animated.View entering={FadeInUp.duration(360).springify().damping(16)} style={styles.heroRow}>
          <ExpoImage
            source={both ? FINN_DANCING : FINN_HAPPY}
            style={styles.mascot}
            contentFit="contain"
            accessible={false}
          />
          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow} allowFontScaling={false}>
              סיכום היום
            </Text>
            <Text style={styles.title} allowFontScaling={false}>
              {both ? 'יום מושלם!' : 'יפה. כל הכבוד.'}
            </Text>
          </View>
        </Animated.View>

        {/* What you learned */}
        <Animated.View entering={FadeIn.delay(120).duration(320)} style={styles.section}>
          <Text style={styles.sectionLabel} allowFontScaling={false}>
            היום למדת
          </Text>
          {items.map((it, i) => {
            const correct = results[i] === true;
            return (
              <View key={i} style={styles.learnedCard}>
                <View style={[styles.statusDot, correct ? styles.statusDotGood : styles.statusDotBad]}>
                  {correct ? (
                    <Check size={14} color="#ffffff" strokeWidth={3} />
                  ) : (
                    <XIcon size={14} color="#ffffff" strokeWidth={3} />
                  )}
                </View>
                <Text style={styles.learnedText} numberOfLines={3} allowFontScaling={false}>
                  {shortHeadline(it.headlineHe)}
                </Text>
              </View>
            );
          })}
        </Animated.View>

        {/* Rewards stats — matches GlobalWealthHeader.resourcePill style so
            the recap reads as a continuation of the app's main wealth strip
            rather than its own bespoke design. Daily streak intentionally
            omitted here (user spec 2026-06-01: "לא צריך להיות שם 1 יום
            ברצף"). The "מחזיק/ה רצף של X ימים" copy below is kept — it's
            narrative, not a pill. */}
        <Animated.View entering={FadeIn.delay(220).duration(320)} style={styles.statsRow}>
          <View style={styles.statPill}>
            <View style={styles.statIconFrame}>
              <Sparkles size={16} color={STITCH.primary} strokeWidth={2.6} />
            </View>
            <Text style={styles.statValue} allowFontScaling={false}>{`+${reward.xp}`}</Text>
          </View>
          <View style={styles.statPill}>
            <View style={styles.statIconFrame}>
              <GoldCoinIcon size={18} />
            </View>
            <Text style={styles.statValue} allowFontScaling={false}>{`+${reward.coins}`}</Text>
          </View>
        </Animated.View>

        {/* Perfect-day bonus card */}
        {both && (
          <Animated.View entering={FadeIn.delay(300).duration(320)} style={styles.perfectCard}>
            <Text style={styles.perfectIcon} allowFontScaling={false}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.perfectTitle} allowFontScaling={false}>בונוס יום מושלם</Text>
              <Text style={styles.perfectSub} allowFontScaling={false}>
                {isPro ? 'שתי תיבות מלאות + יהלום בונוס' : 'תיבה מלאה + יהלום בונוס'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Tomorrow promise — anchors the daily ritual */}
        <Animated.View entering={FadeIn.delay(380).duration(320)} style={styles.tomorrowRow}>
          <Text style={styles.tomorrowText} allowFontScaling={false}>
            {streak >= 3
              ? `מחזיק/ה רצף של ${streak} ימים. נתראה מחר באותה שעה.`
              : 'מחר מהדורה חדשה מחכה. בא/ה לבדוק?'}
          </Text>
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[styles.ctaWrap, ctaStyle]}>
          <Pressable
            onPress={handlePress}
            onPressIn={() => { ctaScale.value = withSpring(0.97, { damping: 18, stiffness: 280 }); }}
            onPressOut={() => { ctaScale.value = withSpring(1, { damping: 18, stiffness: 280 }); }}
            accessibilityRole="button"
            accessibilityLabel="לאסוף את הפרסים ולסגור"
            style={styles.cta}
          >
            <Text style={styles.ctaText} allowFontScaling={false}>
              {both ? 'לאסוף את הפרסים 🌅' : 'סוגרים יום 🌅'}
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 32,
    gap: 16,
    maxWidth: Math.min(SCREEN_W, 480),
    alignSelf: 'center',
    width: '100%',
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
  },
  mascot: {
    width: 72,
    height: 72,
  },
  heroTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0ea5e9',
    writingDirection: 'rtl' as const,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0c4a6e',
    writingDirection: 'rtl' as const,
    marginTop: 2,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#475569',
    writingDirection: 'rtl' as const,
    textAlign: 'right',
  },
  learnedCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusDotGood: {
    backgroundColor: '#22c55e',
  },
  statusDotBad: {
    backgroundColor: '#ef4444',
  },
  learnedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 20,
    writingDirection: 'rtl' as const,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  // Mirrors GlobalWealthHeader.resourcePill so the recap's reward chips
  // read as the same component family as the main wealth strip.
  statPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 22,
    backgroundColor: STITCH.surfaceLow,
    borderWidth: 1.5,
    borderColor: STITCH.ghostBorder,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIconFrame: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
    color: STITCH.onSurface,
  },
  perfectCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
  },
  perfectIcon: {
    fontSize: 28,
  },
  perfectTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400e',
    writingDirection: 'rtl' as const,
    textAlign: 'right',
  },
  perfectSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
    writingDirection: 'rtl' as const,
    textAlign: 'right',
    marginTop: 2,
  },
  tomorrowRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  tomorrowText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    writingDirection: 'rtl' as const,
    textAlign: 'right',
    lineHeight: 19,
  },
  ctaWrap: {
    marginTop: 4,
  },
  cta: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#0891b2',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0e7490',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl' as const,
  },
});
