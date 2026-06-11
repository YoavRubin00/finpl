import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Heart } from 'lucide-react-native';
import { FINN_EMPATHIC } from './finnMascotConfig';
import { tapHaptic } from '../../utils/haptics';
import {
  useCosmeticsStore,
  SHARK_SKINS,
  type SharkSkinId,
} from './useCosmeticsStore';
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

  // Audrey 2026-06-11: re-select is now free — no coin charge, no double-tap
  // lock needed. The "rebuy" name is preserved at the store boundary only for
  // diff readability; it's just selectSkin under the hood.
  const handleReequip = (skin: SharkSkinId) => {
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
          onReequip={handleReequip}
          onDismiss={() => { tapHaptic(); acknowledgeSkinLost(); }}
        />
      )}
    </>
  );
}

interface SkinLostModalProps {
  lostSkin: SharkSkinId;
  onReequip: (skin: SharkSkinId) => void;
  onDismiss: () => void;
}

/** Inline notice — appears when the streak breaks AND a non-classic skin was
 *  equipped. The skin REMAINS unlocked; we just let the user know the Captain
 *  reverted to Classic, and offer a free one-tap re-select when the streak
 *  comes back. No charge, no loss-aversion copy. */
function SkinLostModal({ lostSkin, onReequip, onDismiss }: SkinLostModalProps): React.ReactElement {
  const reduceMotion = useReducedMotion();
  const skinMeta = SHARK_SKINS.find((s) => s.id === lostSkin) ?? SHARK_SKINS[0];
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
                חזרנו לקלאסיק
              </Text>
              <Text style={[lostStyles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                {`הרצף נשבר, והקפטן חזר לסקין הקלאסי. ${skinMeta.label} עדיין שלך — תוכל להחזיר אותו בכל רגע, בלי תשלום.`}
              </Text>
            </Animated.View>

            <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(260).duration(360)}>
              <Pressable
                onPress={() => onReequip(lostSkin)}
                style={lostStyles.cta}
                accessibilityRole="button"
                accessibilityLabel={`החזר את ${skinMeta.label}`}
              >
                <Heart size={20} color="#ffffff" strokeWidth={2.6} />
                <Text style={[lostStyles.ctaText, RTL]} allowFontScaling={false}>
                  {`החזר את ${skinMeta.label}`}
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
