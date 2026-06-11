import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Heart } from 'lucide-react-native';
import { FINN_EMPATHIC } from './finnMascotConfig';
import { errorHaptic, tapHaptic } from '../../utils/haptics';
import {
  useCosmeticsStore,
  SHARK_SKINS,
  SKIN_REBUY_COST,
  type SharkSkinId,
} from './useCosmeticsStore';
import { fireEconomyDelta } from '../economy/useEconomyUIStore';
import { useEconomy } from '../economy/useEconomy';
import { useStreak } from '../economy/useStreak';
import { SharkSkinPickerModal } from './SharkSkinPickerModal';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/**
 * R8 T3.5 — Single gate that decides which (if any) cosmetics modal
 * to render based on cosmetics-store state and the current streak.
 *
 * Mounts two modals (only one ever visible at a time):
 *  - Picker: fires the first time current streak ≥ 7 AND the user
 *    hasn't yet been through the unlock ceremony.
 *  - Skin Lost: fires whenever the streak watcher flagged a break
 *    while a non-classic skin was equipped.
 */
export function SharkSkinsGate(): React.ReactElement {
  const unlocked = useCosmeticsStore((s) => s.unlocked);
  const selected = useCosmeticsStore((s) => s.selected);
  const hasSeen7DayPicker = useCosmeticsStore((s) => s.hasSeen7DayPicker);
  const pendingSkinLost = useCosmeticsStore((s) => s.pendingSkinLost);
  const selectSkin = useCosmeticsStore((s) => s.selectSkin);
  const acknowledgeSkinLost = useCosmeticsStore((s) => s.acknowledgeSkinLost);
  const rebuySkin = useCosmeticsStore((s) => s.rebuySkin);

  const streak = useStreak().data?.currentStreak ?? 0;
  const coins = useEconomy().data?.coins ?? 0;

  const pickerEligible =
    !hasSeen7DayPicker &&
    streak >= 7 &&
    unlocked.includes('gold') &&
    unlocked.includes('fire');

  const handlePick = (skin: SharkSkinId) => {
    selectSkin(skin);
  };

  const handleDismissPicker = () => {
    // Treat as "keep classic" — flips the seen flag so the picker
    // doesn't re-fire on every streak check.
    selectSkin('classic');
  };

  // Synchronous re-buy lock. The button is disabled only by !canAfford, so a
  // fast double-tap before the modal unmounts fired fireEconomyDelta twice =
  // -200 instead of -100 (Yoav 2026-06-11 QA). The ref blocks the second tap
  // synchronously; it's reset whenever a NEW skin-loss surfaces.
  const isRebuyingRef = useRef(false);
  useEffect(() => { if (pendingSkinLost) isRebuyingRef.current = false; }, [pendingSkinLost]);

  const handleRebuy = (skin: SharkSkinId) => {
    if (isRebuyingRef.current) return;
    if (coins < SKIN_REBUY_COST) {
      errorHaptic();
      return;
    }
    isRebuyingRef.current = true;
    // Deduct coins via the canonical economy-delta pipe (mirrors the
    // pattern in useRealAssetsStore / useTradingStore). `fireEconomyDelta`
    // handles the optimistic local update + the persistence side effects.
    try { fireEconomyDelta({ coinsDelta: -SKIN_REBUY_COST }); } catch { /* non-fatal */ }
    rebuySkin(skin);
    acknowledgeSkinLost();
  };

  return (
    <>
      <SharkSkinPickerModal
        visible={pickerEligible}
        unlocked={unlocked}
        current={selected}
        onSelect={handlePick}
        onDismiss={handleDismissPicker}
      />
      {pendingSkinLost && (
        <SkinLostModal
          lostSkin={pendingSkinLost}
          coins={coins}
          onRebuy={handleRebuy}
          onDismiss={() => { tapHaptic(); acknowledgeSkinLost(); }}
        />
      )}
    </>
  );
}

interface SkinLostModalProps {
  lostSkin: SharkSkinId;
  coins: number;
  onRebuy: (skin: SharkSkinId) => void;
  onDismiss: () => void;
}

/** Inline reveal modal — appears when the streak breaks AND a non-classic
 *  skin was equipped. Offers a re-buy at SKIN_REBUY_COST coins (the
 *  "forgiving fallback" Yoav called out as a punishment-curve safeguard). */
function SkinLostModal({ lostSkin, coins, onRebuy, onDismiss }: SkinLostModalProps): React.ReactElement {
  const reduceMotion = useReducedMotion();
  const skinMeta = SHARK_SKINS.find((s) => s.id === lostSkin) ?? SHARK_SKINS[0];
  const canAfford = coins >= SKIN_REBUY_COST;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={lostStyles.backdrop} accessibilityViewIsModal>
        <SafeAreaView style={lostStyles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={reduceMotion ? undefined : FadeInUp.duration(380)} style={lostStyles.card}>
            <View style={lostStyles.heroWrap}>
              <ExpoImage
                source={FINN_EMPATHIC}
                style={lostStyles.hero}
                contentFit="contain"
                accessible={false}
              />
            </View>

            <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(160).duration(360)}>
              <Text style={[lostStyles.title, RTL_CENTER]} allowFontScaling={false}>
                הסקין נשבר 💔
              </Text>
              <Text style={[lostStyles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                {`הרצף נגמר, והקפטן חזר ל"קלאסיק". אם תרצה — תקנה את ${skinMeta.label} בחזרה ב-${SKIN_REBUY_COST} מטבעות.`}
              </Text>
            </Animated.View>

            <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(260).duration(360)}>
              <Pressable
                onPress={() => onRebuy(lostSkin)}
                disabled={!canAfford}
                style={[lostStyles.cta, !canAfford && lostStyles.ctaDisabled]}
                accessibilityRole="button"
                accessibilityLabel={`קנה את ${skinMeta.label} בחזרה`}
                accessibilityState={{ disabled: !canAfford }}
              >
                <Heart size={20} color="#ffffff" strokeWidth={2.6} />
                <Text style={[lostStyles.ctaText, RTL]} allowFontScaling={false}>
                  {`קנה בחזרה — ${SKIN_REBUY_COST} מטבעות`}
                </Text>
              </Pressable>
              <Pressable
                onPress={onDismiss}
                style={lostStyles.skipBtn}
                accessibilityRole="button"
                accessibilityLabel="המשך עם קלאסיק"
              >
                <Text style={[lostStyles.skipText, RTL_CENTER]} allowFontScaling={false}>
                  המשך עם קלאסיק
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const lostStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'center',
  },
  safe: {
    paddingHorizontal: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  heroWrap: {
    alignSelf: 'center',
    marginBottom: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    padding: 8,
  },
  hero: {
    width: 88,
    height: 88,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0c4a6e',
    marginTop: 4,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14.5,
    color: '#0e7490',
    fontWeight: '600',
    lineHeight: 21,
  },
  cta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#0e7490',
    borderBottomWidth: 4,
    borderBottomColor: '#155e75',
    marginTop: 18,
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  skipBtn: {
    marginTop: 8,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
});
