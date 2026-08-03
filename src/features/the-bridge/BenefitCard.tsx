import { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, Linking, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Lock, Check, ExternalLink, GraduationCap } from 'lucide-react-native';
import { SparkleOverlay } from '../../components/ui/SparkleOverlay';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';

import type { Benefit } from './types';
import { trackBridgeClick } from '../../utils/trackBridgeClick';
import { captureEvent } from '../../lib/posthog';
import { track } from '../../lib/analytics/events';
import { useRewardedAd } from '../../hooks/useRewardedAd';
import { useEconomyUIStore } from '../economy/useEconomyUIStore';
import { getIsraelDateISO } from '../../utils/israelTime';

const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/** Rewarded-ad completion path on unaffordable cards (MONETIZATION-PLAN OTA-1
 *  earn paths). Half the post-chest bonus (AD_BONUS_COINS=500) because this
 *  one is reachable on demand — and gated to ONE claim per IL-day so the
 *  bridge can't be ground with ad views. Granted via the same
 *  addCoins(..., 'lesson') pipe as the chest bonus, so it persists
 *  server-side identically. */
const BRIDGE_AD_BONUS_COINS = 250;
const BRIDGE_AD_BONUS_DATE_KEY = '@finplay/bridge-ad-bonus-date';

interface BenefitCardProps {
  benefit: Benefit;
  coins: number;
  isRedeemed: boolean;
  isPro: boolean;
  onPress: () => void;
  /** Direct purchase shortcut: tapping the cost CTA spends coins and opens the partner URL in one step. */
  onPurchase?: () => void;
  /** When the user arrived via a deep-link `?highlight=<benefit.id>` (e.g. the
   *  mod-0-5 Bridge handoff CTA), this card renders with a gold border + corner
   *  badge so the user immediately recognises "this is the one I was sent to". */
  isHighlighted?: boolean;
}

export function BenefitCard({ benefit, coins, isRedeemed, isPro, onPress, onPurchase, isHighlighted = false }: BenefitCardProps) {
  const router = useRouter();
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

  const borderColor = isHighlighted
    ? '#f59e0b' // amber/gold — matches the mod-0-5 handoff CTA
    : isRedeemed
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

  // ── Earn paths on the "חסרים X" state (dead-end fix, MONETIZATION-PLAN
  //    OTA-1): earned only — never a cash/shop link (אודרי: completion is
  //    EARNED, not bought; we profit from the redemption, selling coins toward
  //    it would smell). Primary path: learning. Secondary: the existing
  //    rewarded-ad infra (useRewardedAd singleton), once per IL-day. ──
  const { showAd, isLoaded: adReady } = useRewardedAd();
  const addCoins = useEconomyUIStore((s) => s.addCoins);
  // Pessimistic until the daily-claim gate is read, so the ad row never
  // flashes for a user who already claimed today.
  const [adClaimedToday, setAdClaimedToday] = useState(true);
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(BRIDGE_AD_BONUS_DATE_KEY)
      .then((d) => { if (!cancelled) setAdClaimedToday(d === getIsraelDateISO()); })
      .catch(() => { if (!cancelled) setAdClaimedToday(false); });
    return () => { cancelled = true; };
  }, []);

  const handleLearnPath = () => {
    try { track({ name: 'bridge_earn_path_tapped', props: { benefit_id: benefit.id, path: 'learn' } }); } catch { /* non-fatal */ }
    router.push('/(tabs)/learn' as never);
  };

  const handleAdPath = () => {
    try { track({ name: 'bridge_earn_path_tapped', props: { benefit_id: benefit.id, path: 'rewarded_ad' } }); } catch { /* non-fatal */ }
    // Re-check the gate at tap time — a sibling card may have claimed today's
    // bonus after this card's mount read.
    AsyncStorage.getItem(BRIDGE_AD_BONUS_DATE_KEY)
      .then((d) => {
        const today = getIsraelDateISO();
        if (d === today) { setAdClaimedToday(true); return; }
        showAd(() => {
          addCoins(BRIDGE_AD_BONUS_COINS, 'lesson');
          setAdClaimedToday(true);
          AsyncStorage.setItem(BRIDGE_AD_BONUS_DATE_KEY, today).catch(() => {});
          try { captureEvent('rewarded_ad_completed', { source: 'bridge_earn_path', coins: BRIDGE_AD_BONUS_COINS }); } catch { /* non-fatal */ }
        });
      })
      .catch(() => { /* non-fatal */ });
  };

  const handleOpenPartnerUrl = () => {
    if (benefit.partnerUrl) {
      trackBridgeClick(benefit.id, 'link_open');
      // Direct "open partner" tap from the card itself (used for the
      // already-redeemed re-entry path). Same event name as BridgeScreen's
      // openPartnerUrl call sites so the partner-conversion insight stays
      // one event with `entry_point` as the breakdown.
      captureEvent('bridge_partner_url_opened', {
        benefit_id: benefit.id,
        partner_name: benefit.partnerName,
        category: benefit.category,
        cost_coins: benefit.costCoins,
        entry_point: 'benefit_card_external_link',
        was_redeemed_before: isRedeemed,
        is_pro: isPro,
      });
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

      <View style={[styles.card, { borderColor, borderWidth: isHighlighted ? 2.5 : undefined }]}>
        {isPartnerAd && <SparkleOverlay color="#38bdf8" density="low" active />}

        {/* Official partner ribbon */}
        {isPartnerAd && (
          <View style={styles.adRibbon}>
            <Text style={styles.adRibbonText}>שותף רשמי</Text>
          </View>
        )}

        {/* "מתאים לך" highlight badge — appears when user arrived via a
            deep-link that explicitly targets this benefit (e.g. mod-0-5
            Bridge handoff). Tucked top-left so it doesn't clash with the
            partner ribbon (top-right). */}
        {isHighlighted && (
          <View style={{ position: 'absolute', top: 10, left: 10, zIndex: 5, backgroundColor: '#f59e0b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#ffffff', writingDirection: 'rtl' }}>💡 מתאים לך</Text>
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
            <ExternalLink size={14} color="#ffffff" />
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
                    <Text style={styles.costTextRedeemed}>מומש</Text>
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
          <>
            <Text style={styles.coinsNeededText}>חסרים {coinsNeeded.toLocaleString()} מטבעות</Text>
            {/* Completion paths — the "חסרים X" dead-end fix. The static hint
                became a real door: tapping goes straight to the learn map. */}
            <Pressable
              onPress={handleLearnPath}
              accessibilityRole="button"
              accessibilityLabel="איך משיגים עוד מטבעות — ללמידה"
              hitSlop={6}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            >
              {/* Android Pressable: bg lives on the inner View */}
              <View style={styles.earnPathBtn}>
                <GraduationCap size={14} color="#0369a1" />
                <Text style={styles.earnPathText}>איך משיגים עוד? כל שיעור = מטבעות</Text>
              </View>
            </Pressable>
            {!isPro && adReady && !adClaimedToday && (
              <Pressable
                onPress={handleAdPath}
                accessibilityRole="button"
                accessibilityLabel={`צפייה בפרסומת וקבלת ${BRIDGE_AD_BONUS_COINS} מטבעות`}
                hitSlop={6}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.earnPathBtn, styles.earnPathBtnAd]}>
                  <Text style={[styles.earnPathText, styles.earnPathTextAd]}>
                    🎬 צפייה קצרה = +{BRIDGE_AD_BONUS_COINS} מטבעות
                  </Text>
                </View>
              </Pressable>
            )}
          </>
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
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0ea5e9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 3,
    borderBottomColor: '#0369a1',
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginBottom: 10,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  partnerUrlText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
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
  earnPathBtn: {
    marginTop: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  earnPathBtnAd: {
    backgroundColor: '#fef9c3',
    borderColor: '#fde047',
  },
  earnPathText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
    writingDirection: 'rtl' as const,
    textAlign: 'center' as const,
  },
  earnPathTextAd: {
    color: '#a16207',
  },
});
