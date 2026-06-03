import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import type { AnimationObject } from 'lottie-react-native';

import { LottieIcon } from '../../../components/ui/LottieIcon';
import { GoldCoinIcon } from '../../../components/ui/GoldCoinIcon';
import { STITCH } from '../../../constants/theme';
import { tapHaptic, successHaptic } from '../../../utils/haptics';
import { previewRegularReward, previewProReward, type ChallengeRewardSummary } from '../useDailyNewsChallengeStore';

const LOTTIE_CHEST = require('../../../../assets/lottie/3D Treasure Box.json') as unknown as AnimationObject;
const LOTTIE_CROWN = require('../../../../assets/lottie/Crown.json') as unknown as AnimationObject;

interface CompletionChestsProps {
  /** True when the user has answered both questions. */
  unlocked: boolean;
  /** Pro subscriber? Determines if the gold chest is interactive. */
  isPro: boolean;
  /** Current news-challenge streak (drives bonus preview). */
  streak: number;
  /** State persisted in the store — controls "already opened" visuals. */
  regularOpened: boolean;
  proOpened: boolean;
  /** Handlers — should call the store's claim methods + show flying rewards. */
  onClaimRegular: () => ChallengeRewardSummary | null;
  onClaimPro: () => ChallengeRewardSummary | null;
  /** Optional CTA to push not-yet-Pro users to upgrade. */
  onUpgradePress?: () => void;
}

/**
 * Single-chest completion view (2026-06-02 rework). The earlier dual-chest
 * layout (Pro + Regular, with a crown lottie and a "PRO" tilted badge) did
 * not land in QA, two identical chests with different tags read as a paywall
 * gimmick, not a reward. Yam called it: one real chest, real reward, real
 * CTA. The Pro/Crown column was removed entirely, regardless of subscription
 * status, the regular chest is the only thing on the page.
 *
 * The `isPro`, `proOpened`, `onClaimPro`, `onUpgradePress` props are kept in
 * the interface so the parent (ChestsPage + DailyNewsChallengeSheet) can
 * keep passing them without a cascading refactor, they are simply unused
 * here. Re-introducing a Pro reward later should happen as a separate
 * surface (e.g. a streak-milestone chest), not as a second column on this
 * end-screen.
 */
export function CompletionChests({
  unlocked,
  isPro,
  streak,
  regularOpened,
  proOpened,
  onClaimRegular,
  onClaimPro,
  onUpgradePress,
}: CompletionChestsProps): React.ReactElement {
  const reduceMotion = useReducedMotion();
  const [regularJustOpened, setRegularJustOpened] = useState(false);
  const [proJustOpened, setProJustOpened] = useState(false);
  const [lastRegular, setLastRegular] = useState<ChallengeRewardSummary | null>(null);
  const [lastPro, setLastPro] = useState<ChallengeRewardSummary | null>(null);

  // Pulsing glow when chest is "ready to open"
  const glow = useSharedValue(reduceMotion ? 0.6 : 0);
  useEffect(() => {
    if (reduceMotion) {
      glow.value = 0.6;
      return;
    }
    if (unlocked && (!regularOpened || (isPro && !proOpened))) {
      glow.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 900 }),
          withTiming(0.2, { duration: 900 }),
        ),
        -1,
        true,
      );
    }
  }, [unlocked, regularOpened, proOpened, isPro, glow, reduceMotion]);

  const glowStyle = useAnimatedStyle(() => ({ shadowOpacity: glow.value }));

  const regularPreview = previewRegularReward(streak);
  const proPreview = previewProReward(streak);

  const handleClaimRegular = () => {
    if (regularOpened || !unlocked) return;
    tapHaptic();
    successHaptic();
    const reward = onClaimRegular();
    if (reward) {
      setLastRegular(reward);
      setRegularJustOpened(true);
    }
  };

  const handleClaimPro = () => {
    if (!isPro) {
      tapHaptic();
      onUpgradePress?.();
      return;
    }
    if (proOpened || !unlocked) return;
    tapHaptic();
    successHaptic();
    const reward = onClaimPro();
    if (reward) {
      setLastPro(reward);
      setProJustOpened(true);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(360)} style={styles.wrap}>
      <View style={[styles.row, !isPro && styles.rowSingle]}>
        {/* PRO chest — rendered ONLY for Pro subscribers. Non-Pro users see
            just the regular chest (no lock/upsell here — the Pro upsell lives
            elsewhere in the app, no need to clutter the chest area). */}
        {isPro && (
          <View style={styles.proCol}>
            <View style={styles.crownWrap}>
              <LottieIcon source={LOTTIE_CROWN as unknown as number} size={36} autoPlay={!reduceMotion} loop={false} active={!reduceMotion} />
            </View>
            <View style={styles.chestOuter}>
              {unlocked && !proOpened && (
                <Animated.View pointerEvents="none" style={[styles.glowHalo, { backgroundColor: '#d97706' }, glowStyle]} />
              )}
              <Pressable
                onPress={handleClaimPro}
                disabled={proOpened}
                accessibilityRole="button"
                accessibilityLabel={proOpened ? 'תיבת פרו נפתחה' : 'פתח תיבת פרו'}
                style={[
                  styles.chestWrap,
                  styles.chestWrapPro,
                  unlocked && !proOpened && styles.chestWrapReady,
                  { opacity: proOpened ? 0.65 : 1 },
                ]}
              >
                <LottieIcon
                  source={LOTTIE_CHEST as unknown as number}
                  size={130}
                  autoPlay={false}
                  active={proJustOpened || proOpened}
                  loop={false}
                />
                <View style={styles.proBadge} pointerEvents="none">
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </Pressable>
            </View>
            <Text style={styles.chestLabel} allowFontScaling={false}>תיבת פרו</Text>
            <View style={styles.rewardRow}>
              <RewardPill label="XP" value={`+${(lastPro ?? proPreview).xp}`} color="#a78bfa" />
              <RewardPill icon={<GoldCoinIcon size={14} />} value={`+${(lastPro ?? proPreview).coins}`} color="#facc15" />
              {(lastPro ?? proPreview).gems > 0 && (
                <RewardPill label="💎" value={`+${(lastPro ?? proPreview).gems}`} color="#22d3ee" />
              )}
            </View>
          </View>
        )}

        {/* Regular chest — smaller, on the RIGHT */}
        <View style={styles.regularCol}>
          <View style={{ height: 36 }} accessible={false} />
          <View style={styles.chestOuter}>
            {unlocked && !regularOpened && (
              <Animated.View pointerEvents="none" style={[styles.glowHalo, glowStyle]} />
            )}
            <Pressable
              onPress={handleClaimRegular}
              disabled={regularOpened || !unlocked}
              accessibilityRole="button"
              accessibilityLabel={regularOpened ? 'תיבה נפתחה' : unlocked ? 'פתח תיבה' : 'התיבה נעולה'}
              style={[
                styles.chestWrap,
                unlocked && !regularOpened && styles.chestWrapReady,
                { opacity: regularOpened ? 0.65 : unlocked ? 1 : 0.45 },
              ]}
            >
              <LottieIcon
                source={LOTTIE_CHEST as unknown as number}
                size={110}
                autoPlay={false}
                active={regularJustOpened || regularOpened}
                loop={false}
              />
            </Pressable>
          </View>
          <Text style={styles.chestLabel} allowFontScaling={false}>תיבה רגילה</Text>
          <View style={styles.rewardRow}>
            <RewardPill label="XP" value={`+${(lastRegular ?? regularPreview).xp}`} color="#a78bfa" />
            <RewardPill icon={<GoldCoinIcon size={14} />} value={`+${(lastRegular ?? regularPreview).coins}`} color="#facc15" />
          </View>
        </View>
      </View>

      {regularPreview.streakBonusPct > 0 && (
        <Text style={styles.streakBonus} allowFontScaling={false}>
          🔥 בונוס רצף +{regularPreview.streakBonusPct}% ({streak} ימים ברצף)
        </Text>
      )}
    </Animated.View>
  );
}

function RewardPill({
  label,
  icon,
  value,
  color,
}: {
  label?: string;
  /** Optional icon node — preferred for coins (GoldCoinIcon) so we don't show
   *  a misaligned emoji glyph. Mutually exclusive with `label`. */
  icon?: React.ReactNode;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      {icon ? (
        <View style={styles.pillIconWrap}>{icon}</View>
      ) : (
        <Text style={styles.pillLabel} allowFontScaling={false}>{label}</Text>
      )}
      <Text style={[styles.pillValue, { color }]} allowFontScaling={false}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  // When only the regular chest is shown (non-Pro user), center it instead
  // of leaving the Pro slot as empty whitespace on one side.
  rowSingle: {
    justifyContent: 'center',
  },
  proCol: {
    flex: 13,
    alignItems: 'center',
    gap: 6,
  },
  regularCol: {
    flex: 10,
    alignItems: 'center',
    gap: 6,
  },
  crownWrap: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestOuter: {
    position: 'relative',
  },
  glowHalo: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 90,
    backgroundColor: STITCH.tertiaryGoldBright,
    shadowColor: STITCH.tertiaryGoldBright,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    elevation: 8,
  },
  chestWrap: {
    borderRadius: 16,
    padding: 6,
    backgroundColor: 'rgba(248,250,252,0.6)',
    borderWidth: 2,
    borderColor: STITCH.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestWrapPro: {
    borderColor: '#d97706',
  },
  chestWrapReady: {
    borderColor: STITCH.tertiaryGoldBright,
    shadowColor: STITCH.tertiaryGoldBright,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 6,
  },
  proBadge: {
    position: 'absolute',
    top: -10,
    right: -6,
    backgroundColor: '#d97706',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '8deg' }],
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  lockText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  chestLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: STITCH.onSurface,
    writingDirection: 'rtl',
  },
  rewardRow: {
    flexDirection: 'row-reverse',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1.2,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: STITCH.onSurfaceVariant,
  },
  pillIconWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillValue: {
    fontSize: 11,
    fontWeight: '900',
  },
  streakBonus: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f97316',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
