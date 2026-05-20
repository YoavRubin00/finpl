import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { useEconomyStore } from '../economy/useEconomyStore';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { purchaseGemBundle } from '../../services/revenueCat';
import { logPurchase } from '../../utils/fbEvents';
import { captureEvent } from '../../lib/posthog';
import type { GemBundle, CoinBundle } from './types';

type AnyBundle = GemBundle | CoinBundle;

function isCoinBundle(b: AnyBundle): b is CoinBundle {
  return 'coins' in b;
}

// Per-platform RC key check — Android with only an Apple key set was falling
// through to the real-money branch and crashing in RevenueCat init. Without
// the proper key for the current platform we grant locally (dev preview path).
const HAS_RC_KEY = Platform.OS === 'android'
  ? !!process.env.EXPO_PUBLIC_RC_GOOGLE_KEY
  : Platform.OS === 'ios'
    ? !!process.env.EXPO_PUBLIC_RC_APPLE_KEY
    : false;

interface IAPModalProps {
  visible: boolean;
  bundle: AnyBundle | null;
  onDismiss: () => void;
  onPurchaseSuccess: () => void;
}

export function IAPModal({ visible, bundle, onDismiss, onPurchaseSuccess }: IAPModalProps) {
  const addGems = useEconomyStore((s) => s.addGems);
  const addCoins = useEconomyStore((s) => s.addCoins);
  const [showConfetti, setShowConfetti] = useState(false);
  const insets = useSafeAreaInsets();

  const spendGems = useEconomyStore((s) => s.spendGems);

  useEffect(() => {
    if (visible && bundle) {
      captureEvent('paywall_viewed', {
        paywall: isCoinBundle(bundle) ? 'coin_bundle' : 'gem_bundle',
        bundle_id: bundle.id,
      });
    }
  }, [visible, bundle]);

  const handlePurchase = useCallback(async () => {
    if (!bundle) return;
    tapHaptic();

    captureEvent('purchase_initiated', {
      bundle_id: bundle.id,
      bundle_type: isCoinBundle(bundle) ? 'coin_bundle' : 'gem_bundle',
      price_ils: isCoinBundle(bundle) ? null : (bundle as GemBundle).priceILS,
    });

    if (isCoinBundle(bundle)) {
      // Coin bundles cost gems, local transaction
      if (!spendGems(bundle.gemCost)) {
        captureEvent('purchase_failed', { bundle_id: bundle.id, reason: 'insufficient_gems' });
        return;
      }
      addCoins(bundle.coins);
      captureEvent('purchase_completed', { bundle_id: bundle.id, bundle_type: 'coin_bundle', coins: bundle.coins });
    } else {
      // Gem bundles, real-money purchase via RevenueCat
      try {
        if (HAS_RC_KEY) {
          await purchaseGemBundle(bundle.id);
        }
        // No RC key on this platform → dev preview path: grant locally so the
        // flow stays clickable instead of throwing "Purchases not configured".
        addGems(bundle.gems);
        // Facebook attribution — only on real-money branch with RC key. The
        // dev grant path (no RC) shouldn't pollute Ads Manager ROAS data.
        if (HAS_RC_KEY) {
          logPurchase(bundle.priceILS, 'ILS', {
            fb_content_type: 'gem_bundle',
            fb_content_id: bundle.id,
            fb_num_items: bundle.gems,
          });
        }
        captureEvent('purchase_completed', {
          bundle_id: bundle.id,
          bundle_type: 'gem_bundle',
          gems: bundle.gems,
          price_ils: bundle.priceILS,
          real_money: HAS_RC_KEY,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'שגיאה לא צפויה';
        // RC user-cancel surfaces as a thrown error too — quietly close.
        if (
          (err instanceof Error && err.message.includes('PURCHASE_CANCELLED')) ||
          /cancel|user.{0,2}cancell/i.test(msg)
        ) {
          captureEvent('purchase_cancelled', { bundle_id: bundle.id, bundle_type: 'gem_bundle' });
          return;
        }
        captureEvent('purchase_failed', { bundle_id: bundle.id, bundle_type: 'gem_bundle', error_message: msg });
        Alert.alert('שגיאת רכישה', msg);
        return;
      }
    }

    // Premium haptic choreography
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    successHaptic();
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      onPurchaseSuccess();
      onDismiss();
    }, 1800);
  }, [bundle, addGems, addCoins, spendGems, onPurchaseSuccess, onDismiss]);

  const handleDismiss = useCallback(() => {
    if (bundle) {
      captureEvent('paywall_dismissed', {
        paywall: isCoinBundle(bundle) ? 'coin_bundle' : 'gem_bundle',
        bundle_id: bundle.id,
      });
    }
    onDismiss();
  }, [bundle, onDismiss]);

  if (!bundle) return null;

  const isCoins = isCoinBundle(bundle);
  const amountLabel = isCoins
    ? ` ${bundle.coins.toLocaleString()} מטבעות`
    : `💎 ${(bundle as GemBundle).gems.toLocaleString()} ג'מס`;
  const accentColor = isCoins ? '#d4a017' : '#0891b2';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
      accessibilityViewIsModal
      // Android: when a transparent Modal is opened from inside another Modal
      // (e.g. ShopModal's pageSheet), without statusBarTranslucent the inner
      // Modal renders behind the outer one and the user sees nothing happen.
      statusBarTranslucent
    >
      {showConfetti && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 999, pointerEvents: 'none' }}>
          <ConfettiExplosion onComplete={() => setShowConfetti(false)} />
        </View>
      )}
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { borderColor: `${accentColor}55`, paddingBottom: 32 + insets.bottom }]}>
          {/* Close X — replaces tap-outside-to-dismiss to avoid the
              Pressable-backdrop hit-test bug that broke the CTA on Android. */}
          <Pressable
            onPress={handleDismiss}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="סגור"
          >
            <X size={20} color="#94a3b8" />
          </Pressable>

          {/* Handle */}
          <View style={styles.handle} />

          {/* Hero */}
          <View style={styles.hero}>
            {bundle.lottieSource ? (
              <LottieIcon source={bundle.lottieSource} size={64} />
            ) : (
              <Text style={styles.heroEmoji}>{bundle.emoji}</Text>
            )}
            <Text style={styles.heroTitle}>{bundle.name}</Text>
            <Text style={[styles.heroAmount, { color: accentColor, textShadowColor: `${accentColor}66` }]}>
              {amountLabel}
            </Text>
            {bundle.bonusLabel && (
              <View style={[styles.bonusBadge, { borderColor: `${accentColor}66`, backgroundColor: `${accentColor}22` }]}>
                <Text style={[styles.bonusText, { color: accentColor }]}>{bundle.bonusLabel}</Text>
              </View>
            )}
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>מחיר:</Text>
            <Text style={styles.priceValue}>
              {isCoins ? `💎 ${(bundle as CoinBundle).gemCost}` : (bundle as GemBundle).priceLabel}
            </Text>
          </View>

          {/* CTA — premium 3D button with outer glow ring + shine rim */}
          <View style={[styles.buyBtnGlow, isCoins ? styles.buyBtnGlowCoins : styles.buyBtnGlowGems]} pointerEvents="none" />
          <Pressable
            onPress={handlePurchase}
            style={({ pressed }) => [
              styles.buyBtn,
              isCoins ? styles.buyBtnCoins : styles.buyBtnGems,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isCoins ? 'המר לזהב' : 'קנה עכשיו'}
          >
            <LinearGradient
              colors={isCoins
                ? ['#FDE68A', '#FBBF24', '#D97706', '#92400E']
                : ['#BAE6FD', '#7DD3FC', '#0284C7', '#075985']}
              locations={[0, 0.35, 0.75, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 38 }]}
              pointerEvents="none"
            />
            {/* Glass shine — bright top half giving the "wet glass" look */}
            <LinearGradient
              colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.buyBtnRim}
              pointerEvents="none"
            />
            {/* Hairline white border at very top for "metallic" edge */}
            <View style={styles.buyBtnTopEdge} pointerEvents="none" />
            <Text
              style={[styles.buyBtnText, isCoins && styles.buyBtnTextCoins]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              allowFontScaling={false}
            >
              {isCoins ? '💎 המר לזהב' : '🛒 קנה עכשיו'}
            </Text>
          </Pressable>

          {/* Fine print */}
          <Text style={styles.finePrint}>💳 התשלום מאובטח דרך חנות האפליקציות</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Mirrors StarterPackModal: backdrop is a static parent View (no
  // sibling Pressable) so it can never intercept the CTA's touches on
  // Android. justifyContent:flex-end keeps the bottom-sheet feel.
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148,163,184,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginTop: 12,
    marginBottom: 20,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroEmoji: {
    fontSize: 52,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1f2937',
    writingDirection: 'rtl' as const,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '900',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  bonusBadge: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  bonusText: {
    fontSize: 13,
    fontWeight: '800',
    writingDirection: 'rtl' as const,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748b',
    writingDirection: 'rtl' as const,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1f2937',
  },
  // Outer glow ring — a soft halo behind the button. position:absolute
  // so it sits behind the Pressable without affecting layout.
  buyBtnGlow: {
    position: 'absolute',
    alignSelf: 'center',
    width: '100%',
    height: 76,
    borderRadius: 38,
    opacity: 0.85,
  },
  buyBtnGlowGems: {
    backgroundColor: 'transparent',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 0,
  },
  buyBtnGlowCoins: {
    backgroundColor: 'transparent',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 26,
    elevation: 0,
  },
  buyBtn: {
    width: '100%',
    height: 76,
    borderRadius: 38,
    paddingHorizontal: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    marginBottom: 16,
    elevation: 22,
  },
  buyBtnGems: {
    borderBottomColor: '#075985',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  buyBtnCoins: {
    borderBottomColor: '#7C2D12',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.95,
    shadowRadius: 34,
  },
  // Shiny glass overlay on the top half — gives the wet "premium gel" feel.
  buyBtnRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
  },
  // Hairline metallic border at the very top edge of the button.
  buyBtnTopEdge: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 1,
  },
  buyBtnText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl' as const,
    letterSpacing: 0.6,
    textShadowColor: 'rgba(3, 105, 161, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  buyBtnTextCoins: {
    textShadowColor: 'rgba(146, 64, 14, 0.7)',
  },
  finePrint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
});
