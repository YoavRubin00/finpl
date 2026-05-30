import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Newspaper, Sparkles, CheckCircle2, ChevronLeft, Snowflake } from 'lucide-react-native';

import { STITCH } from '../../constants/theme';
import { tapHaptic } from '../../utils/haptics';
import { useDailyNewsChallengeStore } from './useDailyNewsChallengeStore';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import type { DailyChallenge } from './types';

const HERO_GRADIENT = ['#1e3a8a', '#0c4a6e', '#0e7490'] as const;
const ACCENT_GOLD = '#facc15';

interface DailyNewsChallengeCardProps {
  challenge: DailyChallenge | null;
  completed: boolean;
  proChestOpened: boolean;
  isPro: boolean;
  onPress: () => void;
}

/**
 * Newspaper-style hero card at the TOP of the learn screen.
 * Replaces the legacy DailyQuestWidget. Tapping opens the news challenge sheet.
 */
export function DailyNewsChallengeCard({
  challenge,
  completed,
  proChestOpened,
  isPro,
  onPress,
}: DailyNewsChallengeCardProps): React.ReactElement | null {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  // DNC-specific streak counter was retired — the unified daily streak in
  // the header (GlobalWealthHeader → useEconomyUIStore.currentStreak) is the
  // single source of truth. Showing a second number here was confusing.
  const perfectDays = useDailyNewsChallengeStore((s) => s.perfectDays);
  // Read freeze count from the global economy store — there's only one
  // source of truth for streak freezes, shared with [[StreakFreezeSaveModal]].
  const freezesAvailable = useEconomyUIStore((s) => s.streakFreezes);

  if (!challenge) return null;

  // Pro user who already completed + opened both chests => fully done
  const fullyDone = completed && (isPro ? proChestOpened : true);

  const ctaText = (() => {
    if (!completed) return 'התחל לעדכן את עצמך';
    if (isPro && !proChestOpened) return 'פתח גם את תיבת ה-Pro';
    return 'סיימת את האקטואליה הפיננסית להיום 🎉';
  })();

  const handlePress = () => {
    tapHaptic();
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.duration(320).springify().damping(18)} style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 18, stiffness: 280 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 280 }); }}
        accessibilityRole="button"
        accessibilityLabel="אקטואליה פיננסית — חדשות מהבוקר"
      >
        <LinearGradient
          colors={HERO_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Top row: newspaper icon + label + completion dot */}
          <View style={styles.topRow}>
            <View style={styles.iconBadge}>
              <Newspaper size={20} color="#0f172a" strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow} allowFontScaling={false}>
                אקטואליה פיננסית
              </Text>
              <Text style={styles.heroTitle} numberOfLines={2} allowFontScaling={false}>
                {challenge.heroTitle}
              </Text>
            </View>
            <View style={styles.badgeStack}>
              {freezesAvailable > 0 && (
                <View style={styles.freezeBadge} accessibilityLabel="קפאון זמין">
                  <Snowflake size={11} color="#0ea5e9" strokeWidth={2.6} />
                </View>
              )}
              {perfectDays > 0 && (
                <Text style={styles.perfectBadge} allowFontScaling={false} accessibilityLabel={`${perfectDays} ימים מושלמים`}>
                  🏆
                </Text>
              )}
              {fullyDone && (
                <CheckCircle2 size={22} color={ACCENT_GOLD} strokeWidth={2.4} />
              )}
            </View>
          </View>

          {/* Optional hero image strip */}
          {challenge.heroImageUrl ? (
            <Image
              source={{ uri: challenge.heroImageUrl }}
              style={styles.heroImage}
              accessible={false}
            />
          ) : (
            <View style={styles.heroImagePlaceholder}>
              <Sparkles size={18} color="rgba(255,255,255,0.5)" strokeWidth={2} />
              <Text style={styles.placeholderText} allowFontScaling={false}>
                חדשות הבוקר
              </Text>
            </View>
          )}

          {/* Bottom CTA strip */}
          <View style={styles.ctaRow}>
            <View style={styles.ctaPill}>
              <Text style={styles.ctaText} allowFontScaling={false}>{ctaText}</Text>
              <ChevronLeft size={16} color="#0f172a" strokeWidth={2.8} />
            </View>
            <Text style={styles.meta} allowFontScaling={false}>
              2 שאלות · תיבת תגמול{isPro ? ' ×2' : ''}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    shadowColor: '#0c4a6e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  badgeStack: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  streakBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 247, 237, 0.95)',
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f97316',
  },
  freezeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(224, 242, 254, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfectBadge: {
    fontSize: 14,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: ACCENT_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT_GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(250,204,21,0.95)',
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  heroImage: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroImagePlaceholder: {
    width: '100%',
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    writingDirection: 'rtl',
  },
  ctaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ctaPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACCENT_GOLD,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    writingDirection: 'rtl',
  },
  meta: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    writingDirection: 'rtl',
    textAlign: 'left',
  },
});

// Re-export STITCH only if needed elsewhere
void STITCH;
