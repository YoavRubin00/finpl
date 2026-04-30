import { useEffect } from 'react';
import { View, Text, Image, Pressable, Linking, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Lock, Check, ExternalLink } from 'lucide-react-native';
import { SparkleOverlay } from '../../components/ui/SparkleOverlay';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';

import type { Benefit } from './types';
import { trackBridgeClick } from '../../utils/trackBridgeClick';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface BenefitCardProps {
  benefit: Benefit;
  coins: number;
  isRedeemed: boolean;
  isPro: boolean;
  onPress: () => void;
  /** Direct purchase shortcut: tapping the cost CTA spends coins and opens the partner URL in one step. */
  onPurchase?: () => void;
}

export function BenefitCard({ benefit, coins, isRedeemed, isPro, onPress, onPurchase }: BenefitCardProps) {
  const canAfford   = coins >= benefit.costCoins;
  const lockedByPro = benefit.proOnly && !isPro;
  const isAdSlot    = benefit.partnerAdSlot === true;
  const isPartnerAd = benefit.isPartnerAd === true;
  // Redeemed cards remain tappable so the user can re-open the partner URL
  // via the redemption modal (which detects the redeemed state and skips
  // re-spending coins).
  const isDisabled  = !benefit.isAvailable || lockedByPro || isAdSlot;
  const coinsNeeded = benefit.costCoins - coins;
  const progress    = Math.min(coins / benefit.costCoins, 1);

  // Animated progress bar
  const barWidth = useSharedValue(0);
  useEffect(() => {
    barWidth.value = withSpring(progress, { damping: 16, stiffness: 60 });
    return () => cancelAnimation(barWidth);
  }, [progress]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%` as `${number}%`,
  }));

  // Glow pulse when affordable
  const glowOpacity = useSharedValue(0);
  useEffect(() => {
    if (canAfford && !isRedeemed && benefit.isAvailable && !lockedByPro) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(0.35, { duration: 1200 })
        ),
        -1,
        true
      );
    } else {
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
    return () => cancelAnimation(glowOpacity);
  }, [canAfford, isRedeemed]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  const borderColor = isRedeemed
    ? '#bae6fd'
    : canAfford && benefit.isAvailable && !lockedByPro
      ? '#38bdf8'
      : isPartnerAd
        ? '#bae6fd'
        : 'rgba(186,230,253,0.5)';

  // ── Partner ad slot ──
  if (isAdSlot) {
    return (
      <View style={[styles.card, styles.adSlotCard]}>
        <SparkleOverlay color="#38bdf8" density="low" active />
        {benefit.lottieSource
          ? <LottieIcon source={benefit.lottieSource} size={40} autoPlay loop style={{ marginBottom: 8 }} />
          : <Text style={{ fontSize: 32, marginBottom: 8 }}>{benefit.partnerLogo}</Text>}
        <Text style={styles.adSlotTitle}>{benefit.title}</Text>
        <Text style={styles.adSlotDesc}>{benefit.description}</Text>
        <View style={styles.comingSoonPill}>
          <Text style={styles.comingSoonText}>שותף בקרוב</Text>
        </View>
      </View>
    );
  }

  const handleOpenPartnerUrl = () => {
    if (benefit.partnerUrl) {
      trackBridgeClick(benefit.id, 'link_open');
      Linking.openURL(benefit.partnerUrl);
    }
  };

  return (
    <Pressable
      onPress={!isDisabled ? onPress : undefined}
      disabled={isDisabled}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: 14 }]}
    >
      {/* Pulsing glow ring when affordable */}
      <Animated.View style={[styles.glowRing, { borderColor: '#0ea5e9' }, glowStyle]} />

      <View style={[styles.card, { borderColor }]}>
        {isPartnerAd && <SparkleOverlay color="#38bdf8" density="low" active />}

        {/* Official partner ribbon */}
        {isPartnerAd && (
          <View style={styles.adRibbon}>
            <Text style={styles.adRibbonText}>שותף רשמי</Text>
          </View>
        )}

        {/* Header: logo + title */}
        <View style={styles.headerRow}>
          <View style={[styles.logoCircle, isPartnerAd && styles.logoCircleBlue]}>
            {benefit.partnerLogoImage
              ? <Image source={benefit.partnerLogoImage} style={{ width: 32, height: 32, borderRadius: 6 }} resizeMode="contain" />
              : benefit.lottieSource
                ? <LottieIcon source={benefit.lottieSource} size={28} autoPlay loop />
                : <Text style={{ fontSize: 20 }}>{benefit.partnerLogo}</Text>}
          </View>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, isDisabled && !isRedeemed && styles.titleDisabled]}>
              {benefit.title}
            </Text>
            <Text style={styles.partnerName}>{benefit.partnerName}</Text>
          </View>
        </View>

        {/* Description — truncated on the grid card; RedemptionModal shows full copy. */}
        <Text style={styles.description} numberOfLines={3} ellipsizeMode="tail">{benefit.description}</Text>

        {/* Reward badge */}
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardText}>{benefit.reward}</Text>
        </View>

        {/* Partner URL (after redemption) */}
        {isRedeemed && benefit.partnerUrl && (
          <Pressable onPress={handleOpenPartnerUrl} style={styles.partnerUrlBtn}>
            <ExternalLink size={14} color="#0369a1" />
            <Text style={styles.partnerUrlText}>פתח באתר השותף</Text>
          </Pressable>
        )}

        {/* Bottom row: cost CTA + badges */}
        <View style={styles.bottomRow}>
          {(() => {
            // Active purchase button: affordable, available, not redeemed, not pro-locked,
            // and parent supplied a direct-purchase handler.
            const canPurchaseDirectly =
              canAfford && !isRedeemed && benefit.isAvailable && !lockedByPro && !!onPurchase;
            if (canPurchaseDirectly) {
              return (
                <Pressable
                  onPress={onPurchase}
                  accessibilityRole="button"
                  accessibilityLabel={`רכישה תמורת ${benefit.costCoins} מטבעות`}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.costButton,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <GoldCoinIcon size={16} />
                  <Text style={styles.costButtonText}>
                    עלות {benefit.costCoins.toLocaleString()}
                  </Text>
                </Pressable>
              );
            }
            // Static badge: redeemed / unaffordable / pro-locked / unavailable.
            return (
              <View style={[styles.costBadge, isRedeemed && styles.costBadgeRedeemed]}>
                {isRedeemed ? (
                  <>
                    <Check size={12} color="#0369a1" />
                    <Text style={styles.costTextRedeemed}>הומר</Text>
                  </>
                ) : (
                  <>
                    <GoldCoinIcon size={14} />
                    <Text style={styles.costText}>{benefit.costCoins.toLocaleString()}</Text>
                  </>
                )}
              </View>
            );
          })()}

          {lockedByPro && (
            <View style={styles.proLockBadge}>
              <Lock size={10} color="#0369a1" />
              <Text style={styles.proLockText}>Pro בלבד</Text>
            </View>
          )}

          {!benefit.isAvailable && !isRedeemed && !isAdSlot && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonBadgeText}>בקרוב</Text>
            </View>
          )}

          {canAfford && !isRedeemed && benefit.isAvailable && !lockedByPro && (
            <View style={styles.affordableBadge}>
              <Text style={styles.affordableText}>בהישג יד</Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        {!isRedeemed && benefit.isAvailable && !lockedByPro && (
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                canAfford ? styles.progressBlue : styles.progressLight,
                barStyle,
              ]}
            />
          </View>
        )}

        {!canAfford && !isRedeemed && benefit.isAvailable && !lockedByPro && (
          <Text style={styles.coinsNeededText}>חסרים {coinsNeeded.toLocaleString()} מטבעות</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  glowRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: 14,
    borderRadius: 20,
    borderWidth: 2,
  },
  adSlotCard: {
    borderColor: '#bae6fd',
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 14,
    backgroundColor: '#f0f9ff',
  },
  adSlotTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0369a1',
    textAlign: 'center',
    marginBottom: 4,
  },
  adSlotDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    writingDirection: 'rtl' as const,
    textAlign: 'center' as const,
  },
  comingSoonPill: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  comingSoonText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '700',
  },
  adRibbon: {
    alignSelf: 'flex-end',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  adRibbonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: 'rgba(186,230,253,0.5)',
  },
  logoCircleBlue: {
    backgroundColor: 'rgba(14,165,233,0.08)',
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    ...RTL,
  },
  titleDisabled: { color: '#64748b' },
  partnerName: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    ...RTL,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    marginBottom: 10,
    ...RTL,
  },
  rewardBadge: {
    alignSelf: 'flex-end',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
    ...RTL,
  },
  partnerUrlBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 10,
  },
  partnerUrlText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
    ...RTL,
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: '#bae6fd',
    backgroundColor: '#e0f2fe',
  },
  costBadgeRedeemed: {
    borderColor: '#38bdf8',
    backgroundColor: '#e0f2fe',
  },
  costText: { fontSize: 11, fontWeight: '700', color: '#0369a1' },
  costTextRedeemed: { fontSize: 11, fontWeight: '700', color: '#0369a1' },
  costButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: '#1d4ed8',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  costButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.3,
    writingDirection: 'rtl',
  },
  proLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  proLockText: { fontSize: 11, fontWeight: '700', color: '#0369a1' },
  comingSoonBadge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  comingSoonBadgeText: { fontSize: 11, color: '#64748b' },
  affordableBadge: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38bdf8',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  affordableText: { fontSize: 11, fontWeight: '700', color: '#0284c7' },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(186,230,253,0.4)',
    overflow: 'hidden',
    marginBottom: 4,
    transform: [{ scaleX: -1 }],
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBlue: {
    backgroundColor: '#0ea5e9',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  progressLight: { backgroundColor: '#7dd3fc' },
  coinsNeededText: {
    fontSize: 11,
    color: '#64748b',
    ...RTL,
  },
});
