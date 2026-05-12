/**
 * StarterPackModal — confirmation + redemption flow for the ₪19.90 starter
 * pack. Triggered from FlashOfferBanner in DailyDealsSection.
 *
 * Real-money flow:
 *   1. Local stub fallback (dev only) — when no RC API key is configured the
 *      grant happens locally so the in-app preview still works.
 *   2. Production — calls `purchaseGemBundle('starter-pack')` which goes
 *      through RevenueCat → App Store / Play Billing. Goods are granted only
 *      after the receipt is confirmed.
 *
 * Minor age gating: users with `profile.ageGroup === 'minor'` see a parental
 * consent screen instead of the buy CTA. Apple/Google require explicit
 * acknowledgement before charging users under the age of majority.
 */
import React, { useCallback, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { GoldCoinIcon } from '../../components/ui/GoldCoinIcon';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useAuthStore } from '../auth/useAuthStore';
import { getAvatarById } from '../avatars/avatarData';
import { getAvatarSvgIcon } from '../../components/svg/avatars/AvatarMascots';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import { purchaseGemBundle } from '../../services/revenueCat';
import {
  getTodaysStarterPack,
  STARTER_PACK_PRICE_LABEL,
  STARTER_PACK_ORIGINAL_PRICE_LABEL,
  STARTER_PACK_DISCOUNT_PCT,
} from './starterPack';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onPurchaseSuccess?: () => void;
}

// Per-platform check — Android with only an Apple key set was falling through
// to the real-money branch and crashing in RevenueCat init.
const HAS_RC_KEY = Platform.OS === 'android'
  ? !!process.env.EXPO_PUBLIC_RC_GOOGLE_KEY
  : Platform.OS === 'ios'
    ? !!process.env.EXPO_PUBLIC_RC_APPLE_KEY
    : false;

export function StarterPackModal({ visible, onDismiss, onPurchaseSuccess }: Props) {
  const router = useRouter();
  const addCoins = useEconomyStore((s) => s.addCoins);
  const addGems = useEconomyStore((s) => s.addGems);
  const addOwnedAvatar = useAuthStore((s) => s.addOwnedAvatar);
  const setAvatar = useAuthStore((s) => s.setAvatar);
  const isMinor = useAuthStore((s) => s.profile?.ageGroup === 'minor');
  const [purchasing, setPurchasing] = useState(false);

  // Snapshot today's bundle once per modal open. Avoids visual change mid-modal
  // if the user opens it at 23:59:55 and confirms at 00:00:05.
  const pack = React.useMemo(() => getTodaysStarterPack(), [visible]);

  const grantPack = useCallback(() => {
    addCoins(pack.coins);
    addGems(pack.gems);
    for (const aid of pack.avatarIds) {
      addOwnedAvatar(aid);
    }
    setAvatar(pack.autoEquipAvatarId);
  }, [pack, addCoins, addGems, addOwnedAvatar, setAvatar]);

  const handleConfirm = useCallback(async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      if (HAS_RC_KEY) {
        // Real money path. RC throws on user-cancel — we treat that as a no-op,
        // not a failure, so the modal just closes silently.
        await purchaseGemBundle('starter-pack');
      }
      grantPack();
      successHaptic();
      Alert.alert(
        'נרכש בהצלחה!',
        `קיבלתם ${pack.coins.toLocaleString()} מטבעות, ${pack.gems} יהלומים, ו-${pack.avatarIds.length} אווטרים.`,
      );
      onPurchaseSuccess?.();
      onDismiss();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      // RC user-cancel surfaces as a thrown error too — quietly close.
      if (/cancel|user.{0,2}cancell/i.test(msg)) {
        onDismiss();
        return;
      }
      Alert.alert('הרכישה נכשלה', msg);
    } finally {
      setPurchasing(false);
    }
  }, [purchasing, grantPack, pack, onDismiss, onPurchaseSuccess]);

  const handleCancel = useCallback(() => {
    tapHaptic();
    onDismiss();
  }, [onDismiss]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancel}>
      <View style={styles.backdrop}>
        <View style={styles.cardWrap}>
          <LinearGradient
            colors={['#dc2626', '#f59e0b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.outer}
          >
            <View style={styles.inner}>
              {/* Close */}
              <Pressable
                onPress={handleCancel}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="סגור"
              >
                <X size={18} color="#fef3c7" />
              </Pressable>

              {/* Header */}
              <View style={styles.discountBadge}>
                <Text style={styles.discountText} allowFontScaling={false}>
                  {STARTER_PACK_DISCOUNT_PCT}% הנחה
                </Text>
              </View>
              <Text style={styles.title} allowFontScaling={false}>חבילת מתחילים</Text>
              <Text style={styles.subtitle} allowFontScaling={false}>{pack.tagline}</Text>

              {/* Bundle contents */}
              <View style={styles.contentsBox}>
                <BundleRow
                  icon={<GoldCoinIcon size={26} />}
                  label={`${pack.coins.toLocaleString()} מטבעות`}
                />
                <View style={styles.divider} />
                <BundleRow
                  icon={
                    <View accessible={false}>
                      <LottieView
                        source={require('../../../assets/lottie/Diamond.json')}
                        style={{ width: 32, height: 32 }}
                        autoPlay
                        loop
                      />
                    </View>
                  }
                  label={`${pack.gems} יהלומים`}
                />
                <View style={styles.divider} />
                <View style={styles.avatarRow}>
                  {pack.avatarIds.map((aid) => {
                    const def = getAvatarById(aid);
                    const Svg = getAvatarSvgIcon(aid);
                    return (
                      <View key={aid} style={styles.avatarChip}>
                        {Svg ? <Svg size={56} /> : <Text style={{ fontSize: 36 }}>{def?.emoji ?? '🎮'}</Text>}
                        <Text style={styles.avatarChipName} allowFontScaling={false} numberOfLines={1}>
                          {def?.name ?? aid}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Price */}
              <View style={styles.priceRow}>
                <Text style={styles.salePrice} allowFontScaling={false}>{STARTER_PACK_PRICE_LABEL}</Text>
                <Text style={styles.origPrice} allowFontScaling={false}>{STARTER_PACK_ORIGINAL_PRICE_LABEL}</Text>
              </View>

              {/* CTA / minor gate */}
              {isMinor ? (
                <View style={styles.minorGate}>
                  <Text style={styles.minorTitle} allowFontScaling={false}>נדרשת הסכמה של הורה</Text>
                  <Text style={styles.minorBody} allowFontScaling={false}>
                    רכישות בתשלום זמינות רק לאחר אימות מבוגר אחראי. בקשו מהורה להפעיל את הרכישה במכשיר שלהם.
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleConfirm}
                  disabled={purchasing}
                  style={({ pressed }) => [
                    styles.cta,
                    (pressed || purchasing) && { transform: [{ scale: 0.97 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: purchasing }}
                  accessibilityLabel={`קנה חבילת מתחילים ב-${STARTER_PACK_PRICE_LABEL}`}
                >
                  <LinearGradient
                    colors={['#7DD3FC', '#38BDF8', '#0284C7']}
                    locations={[0, 0.45, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 31 }]}
                  />
                  <View style={styles.ctaRim} pointerEvents="none" />
                  <Text style={styles.ctaText} allowFontScaling={false}>
                    {purchasing ? 'מעבד…' : `קנה ב-${STARTER_PACK_PRICE_LABEL}`}
                  </Text>
                </Pressable>
              )}

              <Pressable onPress={handleCancel} style={styles.maybeLaterBtn} accessibilityRole="button" accessibilityLabel="סגור">
                <Text style={styles.maybeLaterText} allowFontScaling={false}>{isMinor ? 'סגור' : 'אולי אחר כך'}</Text>
              </Pressable>

              {/* Terms acknowledgement — required by Apple App Review for any
                  IAP CTA. The link routes to the unified legal screen which
                  contains both EULA and the privacy policy. */}
              {!isMinor && (
                <Pressable
                  onPress={() => { onDismiss(); router.push('/legal' as never); }}
                  accessibilityRole="link"
                  accessibilityLabel="תנאי שימוש ופרטיות"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.termsText} allowFontScaling={false}>
                    בלחיצה על &quot;קנה&quot; אני מאשר/ת את <Text style={styles.termsLink}>תנאי השימוש</Text>
                  </Text>
                </Pressable>
              )}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

function BundleRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.bundleRow}>
      <View style={styles.bundleIcon}>{icon}</View>
      <Text style={styles.bundleLabel} allowFontScaling={false}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 380,
  },
  outer: {
    borderRadius: 22,
    padding: 3,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 12,
  },
  inner: {
    borderRadius: 19,
    backgroundColor: '#0d2847',
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  discountBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7c2d12',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fef3c7',
    writingDirection: 'rtl' as const,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a8c2',
    marginTop: 2,
    marginBottom: 16,
    writingDirection: 'rtl' as const,
  },
  contentsBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bundleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  bundleIcon: {
    width: 32,
    alignItems: 'center',
  },
  bundleLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fef3c7',
    flex: 1,
    writingDirection: 'rtl' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
  },
  avatarRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    paddingVertical: 8,
    gap: 12,
  },
  avatarChip: {
    alignItems: 'center',
    flex: 1,
  },
  avatarChipName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
    marginTop: 4,
    writingDirection: 'rtl' as const,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 12,
  },
  salePrice: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fbbf24',
    fontVariant: ['tabular-nums'] as const,
    letterSpacing: -0.5,
  },
  origPrice: {
    fontSize: 14,
    color: '#94a8c2',
    textDecorationLine: 'line-through' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  cta: {
    width: '100%',
    height: 62,
    borderRadius: 31,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0369A1',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.85,
    shadowRadius: 28,
    elevation: 16,
  },
  ctaRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderTopLeftRadius: 31,
    borderTopRightRadius: 31,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(3, 105, 161, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  maybeLaterBtn: {
    marginTop: 8,
    paddingVertical: 8,
  },
  maybeLaterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a8c2',
    writingDirection: 'rtl' as const,
  },
  minorGate: {
    width: '100%',
    backgroundColor: 'rgba(56, 189, 248, 0.10)',
    borderColor: 'rgba(56, 189, 248, 0.45)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  minorTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#bae6fd',
    marginBottom: 4,
    writingDirection: 'rtl' as const,
  },
  minorBody: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a8c2',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    lineHeight: 17,
  },
  termsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    writingDirection: 'rtl' as const,
    marginTop: 4,
  },
  termsLink: {
    color: '#22d3ee',
    textDecorationLine: 'underline' as const,
  },
});
