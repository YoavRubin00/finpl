import { useCallback, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Alert } from 'react-native';
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
import type { GemBundle, CoinBundle } from './types';

type AnyBundle = GemBundle | CoinBundle;

function isCoinBundle(b: AnyBundle): b is CoinBundle {
  return 'coins' in b;
}

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
      // Coin bundles cost gems — local transaction
      if (!spendGems(bundle.gemCost)) return;
      addCoins(bundle.coins);
    } else {
      // Gem bundles — real-money purchase via RevenueCat
      try {
        await purchaseGemBundle(bundle.id);
        addGems(bundle.gems);
      } catch (err: unknown) {
        const isCancelled =
          err instanceof Error && err.message.includes('PURCHASE_CANCELLED');
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'שגיאה לא צפויה';
          Alert.alert('שגיאת רכישה', msg);
        }
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
  const btnColor = isCoins ? '#d4a017' : '#0891b2';
  const btnTextColor = isCoins ? '#000' : '#fff';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss} accessibilityViewIsModal>
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
            style={({ pressed }) => [styles.buyBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
            accessibilityRole="button"
            accessibilityLabel={isCoins ? 'המר לזהב' : 'קנה עכשיו'}
          >
            <LinearGradient
              colors={isCoins ? ['#d4a017', '#b8860b', '#d4a017'] : ['#0a2540', '#164e63', '#0a2540']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.buyBtnGradient}
            >
              <Text style={styles.buyBtnText}>
                {isCoins ? '💎 המר לזהב' : '🛒 קנה עכשיו'}
              </Text>
            </LinearGradient>
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
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#0a2540',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 14,
    width: '100%',
  },
  buyBtnGradient: {
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    fontSize: 19,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl' as const,
  },
  finePrint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
  },
});
