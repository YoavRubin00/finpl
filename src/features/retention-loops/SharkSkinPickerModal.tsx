import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Anchor, Check, Lock } from 'lucide-react-native';
import { FINN_HAPPY } from './finnMascotConfig';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import {
  SHARK_SKINS,
  type SharkSkinId,
} from './useCosmeticsStore';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface SharkSkinPickerModalProps {
  visible: boolean;
  /** Which skins are currently unlocked — disables locked tiles. */
  unlocked: SharkSkinId[];
  /** The user's currently-equipped skin (for the initial selection
   *  highlight). */
  current: SharkSkinId;
  /** User tapped "Equip" on a skin. */
  onSelect: (skin: SharkSkinId) => void;
  /** User dismissed the picker without selecting. We treat this as
   *  "keep classic" so the picker doesn't re-fire later. */
  onDismiss: () => void;
}

/**
 * R8 T3.5 — Captain Shark skin picker. Surfaces the first time the
 * user crosses a 7-day streak and unlocks the Gold + Fire variants.
 *
 * Sunk-cost identity loop (Duolingo Owl benchmark): once the user
 * stakes their identity on a non-classic skin, breaking the streak
 * carries an emotional cost — they LOSE the skin until they re-buy.
 * That second cost is what drives the +20% D30 retention lift.
 */
export function SharkSkinPickerModal({
  visible,
  unlocked,
  current,
  onSelect,
  onDismiss,
}: SharkSkinPickerModalProps): React.ReactElement | null {
  const [picked, setPicked] = useState<SharkSkinId>(current);
  if (!visible) return null;

  const handlePick = (skin: SharkSkinId) => {
    tapHaptic();
    setPicked(skin);
  };

  const handleConfirm = () => {
    successHaptic();
    onSelect(picked);
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={FadeInUp.duration(380)} style={styles.card}>
            <View style={styles.heroWrap}>
              <ExpoImage
                source={FINN_HAPPY}
                style={styles.hero}
                contentFit="contain"
                accessible={false}
              />
            </View>

            <Animated.View entering={FadeIn.delay(160).duration(360)}>
              <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
                שבעה ימים ברצף! 🔥
              </Text>
              <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                בחר סקין לקפטן שארק.{'\n'}אם תשבור את הרצף — הסקין יתאדה.
              </Text>
            </Animated.View>

            {/* Skin tiles — Classic always enabled; Gold + Fire enabled
                from this very crossing (unlocked is already updated by
                unlockSevenDayRewards before the modal renders). */}
            <ScrollView
              style={styles.tilesScroll}
              contentContainerStyle={styles.tilesWrap}
              showsVerticalScrollIndicator={false}
            >
              {SHARK_SKINS.map((skin) => {
                const isUnlocked = unlocked.includes(skin.id);
                const isPicked = picked === skin.id;
                return (
                  <Pressable
                    key={skin.id}
                    onPress={isUnlocked ? () => handlePick(skin.id) : undefined}
                    style={[
                      styles.tile,
                      { borderColor: isPicked ? skin.accent : '#e2e8f0' },
                      isPicked && { backgroundColor: `${skin.accent}11` },
                      !isUnlocked && styles.tileLocked,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${skin.label}${isUnlocked ? '' : ' — נעול'}`}
                    accessibilityState={{ selected: isPicked, disabled: !isUnlocked }}
                  >
                    <View style={[styles.tileAccent, { backgroundColor: skin.accent }]} />
                    <View style={styles.tileBody}>
                      <Text style={[styles.tileLabel, RTL]} allowFontScaling={false}>
                        {skin.label}
                      </Text>
                      <Text style={[styles.tileDesc, RTL]} allowFontScaling={false}>
                        {skin.description}
                      </Text>
                    </View>
                    {isPicked && isUnlocked && (
                      <Check size={20} color={skin.accent} strokeWidth={3} />
                    )}
                    {!isUnlocked && <Lock size={18} color="#94a3b8" strokeWidth={2.4} />}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Animated.View entering={FadeIn.delay(280).duration(360)}>
              <Pressable
                onPress={handleConfirm}
                style={styles.cta}
                accessibilityRole="button"
                accessibilityLabel="הלבש את הקפטן"
              >
                <Anchor size={22} color="#ffffff" strokeWidth={2.6} />
                <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                  הלבש את הקפטן
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { tapHaptic(); onDismiss(); }}
                style={styles.skipBtn}
                accessibilityRole="button"
                accessibilityLabel="המשך בקלאסי"
              >
                <Text style={[styles.skipText, RTL_CENTER]} allowFontScaling={false}>
                  המשך בקלאסי
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '88%',
  },
  heroWrap: {
    alignSelf: 'center',
    marginBottom: 10,
    backgroundColor: '#fef3c7',
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
  tilesScroll: {
    marginTop: 16,
    maxHeight: 280,
  },
  tilesWrap: {
    gap: 10,
    paddingVertical: 4,
  },
  tile: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  tileLocked: {
    opacity: 0.55,
  },
  tileAccent: {
    width: 36,
    height: 36,
    borderRadius: 999,
  },
  tileBody: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0c4a6e',
  },
  tileDesc: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
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
