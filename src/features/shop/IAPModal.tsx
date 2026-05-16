import { useCallback, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Alert, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { tapHaptic, successHaptic } from '../../utils/haptics';
import { LottieIcon } from '../../components/ui/LottieIcon';
import { useEconomyStore } from '../economy/useEconomyStore';
import { ConfettiExplosion } from '../../components/ui/ConfettiExplosion';
import { purchaseGemBundle } from '../../services/revenueCat';
import { logPurchase } from '../../utils/fbEvents';
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

  const spendGems = useEconomyStore((s) => s.spendGems);

  const handlePurchase = useCallback(async () => {
    if (!bundle) return;
    tapHaptic();

    if (isCoinBundle(bundle)) {
      // Coin bundles cost gems, local transaction
      if (!spendGems(bundle.gemCost)) return;
      addCoins(bundle.coins);
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'שגיאה לא צפויה';
        // RC user-cancel surfaces as a thrown error too — quietly close.
        if (
          (err instanceof Error && err.message.includes('PURCHASE_CANCELLED')) ||
          /cancel|user.{0,2}cancell/i.test(msg)
        ) {
          return;
        }
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
      animationType="none"
      onRequestClose={onDismiss}
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
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onDismiss} />

        <Animated.View
          entering={SlideInDown.springify().damping(40).stiffness(200)}
          exiting={SlideOutDown.duration(250)}
          style={[styles.sheet, { borderColor: `${accentColor}55` }]}
        >
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

          {/* CTA */}
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
                ? ['#FCD34D', '#F59E0B', '#B45309']
                : ['#7DD3FC', '#38BDF8', '#0284C7']}
              locations={[0, 0.45, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 31 }]}
            />
            <View style={styles.buyBtnRim} pointerEvents="none" />
            <Text style={[styles.buyBtnText, isCoins && styles.buyBtnTextCoins]}>
              {isCoins ? '💎 המר לזהב' : '🛒 קנה עכשיו'}
            </Text>
          </Pressable>

          {/* Fine print */}
          <Text style={styles.finePrint}>💳 התשלום מאובטח דרך חנות האפליקציות</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    paddingHorizontal: 28,
    paddingBottom: 40,
    alignItems: 'center',
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
  buyBtn: {
    width: '100%',
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    marginBottom: 14,
    elevation: 16,
  },
  buyBtnGems: {
    borderBottomColor: '#0369A1',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.85,
    shadowRadius: 28,
  },
  buyBtnCoins: {
    borderBottomColor: '#92400E',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 22,
  },
  buyBtnRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderTopLeftRadius: 31,
    borderTopRightRadius: 31,
  },
  buyBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl' as const,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(3, 105, 161, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buyBtnTextCoins: {
    textShadowColor: 'rgba(146, 64, 14, 0.6)',
  },
  finePrint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
});
