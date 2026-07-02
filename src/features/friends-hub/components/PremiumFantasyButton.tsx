import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Sparkles, Lock } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';

import { tapHaptic } from '../../../utils/haptics';
import { useFantasyStore } from '../../fantasy-league/useFantasyStore';
import {
  getCurrentWeekId,
  getCompetitionPhase,
  getDraftClose,
  getCompetitionEnd,
} from '../../fantasy-league/fantasyData';

interface PremiumFantasyButtonProps {
  /** Visual variant: "hero" = full-width pinned post, "compact" = header chip. */
  variant?: 'hero' | 'compact';
}

/** "5 שעות" / "42 דקות" until `target`, or null if it has already passed. */
function formatUntil(target: Date, now: Date): string | null {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours} שעות`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `${mins} דקות`;
}

interface FantasyLiveState {
  /** Full-width sub-line for the hero variant. */
  sub: string;
  /** Short "X/5" progress badge for the compact variant, or null. */
  picksBadge: string | null;
  /** True once the draft is locked / competition is running. */
  locked: boolean;
}

/**
 * A9: derive the button's live state from REAL fantasy-store data only —
 * whether the user joined THIS week, how many of the 5 picks are in, and the
 * real weekly deadline (draft-lock or competition-close). NO invented
 * participant counts.
 */
function useFantasyLiveState(): FantasyLiveState {
  const currentEntry = useFantasyStore((s) => s.currentEntry);

  // Re-render each minute so the countdown stays fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const weekId = getCurrentWeekId(now);
  const phase = getCompetitionPhase(now);
  const joinedThisWeek = !!currentEntry && currentEntry.weekId === weekId;
  const picks = joinedThisWeek ? currentEntry.picks.length : 0;
  const locked = joinedThisWeek && (!!currentEntry.lockedAt || phase === 'competition');

  if (!joinedThisWeek) {
    const sub =
      phase === 'draft'
        ? 'הדראפט פתוח · בוחרים 5 מניות'
        : phase === 'competition'
          ? 'התחרות רצה · הצטרפו לשבוע הבא'
          : 'בוחרים 5 מניות · תחרות שבועית';
    return { sub, picksBadge: null, locked: false };
  }

  if (phase === 'results') {
    return { sub: 'התוצאות בפנים · אספו פרסים', picksBadge: null, locked: true };
  }

  if (locked) {
    const remaining = formatUntil(getCompetitionEnd(now), now);
    return {
      sub: remaining ? `${picks} מניות ננעלו · נסגר בעוד ${remaining}` : `${picks} מניות ננעלו · התחרות רצה`,
      picksBadge: null,
      locked: true,
    };
  }

  // Draft open, not yet locked — show real picks progress + real lock countdown.
  const remaining = formatUntil(getDraftClose(now), now);
  return {
    sub: remaining ? `בחרתם ${picks}/5 · נעילה בעוד ${remaining}` : `בחרתם ${picks}/5 · נעילה בקרוב`,
    picksBadge: `${picks}/5`,
    locked: false,
  };
}

export function PremiumFantasyButton({
  variant = 'compact',
}: PremiumFantasyButtonProps): React.ReactElement {
  const router = useRouter();
  const reduced = useReducedMotion();
  const live = useFantasyLiveState();

  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      shimmer.value = 0;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [reduced, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.55, 0]),
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-80, 80]) },
    ],
  }));

  const handlePress = React.useCallback(() => {
    tapHaptic();
    router.push('/fantasy' as never);
  }, [router]);

  if (variant === 'hero') {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`פנטזי ליג — ${live.sub}`}
        hitSlop={8}
        style={({ pressed }) => [styles.heroOuter, { opacity: pressed ? 0.92 : 1 }]}
      >
        <LinearGradient
          colors={['#fde68a', '#fbbf24', '#f59e0b', '#d97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <Animated.View pointerEvents="none" style={[styles.heroShimmer, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <Trophy size={26} color="#7c2d12" strokeWidth={2.6} />
              <Sparkles size={12} color="#7c2d12" strokeWidth={2.6} style={styles.heroSparkle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle} maxFontSizeMultiplier={1.15}>
                פנטזי ליג
              </Text>
              <View style={styles.heroSubRow}>
                {live.locked && <Lock size={11} color="rgba(124,45,18,0.85)" strokeWidth={2.8} />}
                <Text
                  style={styles.heroSub}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.15}
                >
                  {live.sub}
                </Text>
              </View>
            </View>
            <Text style={styles.heroArrow}>‹</Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={live.picksBadge ? `פנטזי ליג — בחרתם ${live.picksBadge} מניות` : 'פנטזי ליג'}
      hitSlop={8}
      style={({ pressed }) => [styles.compactOuter, { opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={['#fde68a', '#fbbf24', '#f59e0b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.compactGradient}
      >
        <Animated.View pointerEvents="none" style={[styles.compactShimmer, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.8)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Trophy size={15} color="#7c2d12" strokeWidth={2.8} />
        <Text style={styles.compactText} maxFontSizeMultiplier={1.15}>
          פנטזי ליג
        </Text>
        {live.picksBadge && (
          <View style={styles.compactBadge} importantForAccessibility="no-hide-descendants">
            <Text style={styles.compactBadgeText} maxFontSizeMultiplier={1.15}>
              {live.picksBadge}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroOuter: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 18,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  heroGradient: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
  },
  heroShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
  heroRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  heroSparkle: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7c2d12',
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: -0.2,
  },
  heroSubRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(124,45,18,0.85)',
    writingDirection: 'rtl',
    textAlign: 'right',
    flexShrink: 1,
  },
  heroArrow: {
    fontSize: 22,
    fontWeight: '900',
    color: '#7c2d12',
  },
  compactOuter: {
    borderRadius: 999,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  compactGradient: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    overflow: 'hidden',
  },
  compactShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7c2d12',
    writingDirection: 'rtl',
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  compactBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(124,45,18,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  compactBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#7c2d12',
    fontVariant: ['tabular-nums'],
  },
});
