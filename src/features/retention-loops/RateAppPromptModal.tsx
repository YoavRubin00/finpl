import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Star } from 'lucide-react-native';
import { FINN_DANCING } from './finnMascotConfig';
import { successHaptic, tapHaptic } from '../../utils/haptics';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface RateAppPromptModalProps {
  visible: boolean;
  /** User tapped "לדרג בחנות" — parent opens the store + marks rated. */
  onRate: () => void;
  /** User tapped "אחר כך" — parent just closes (cooldown already started). */
  onLater: () => void;
}

/**
 * Branded "rate FinPlay in the store" prompt (Captain Shark). Pure presentation
 * — the parent (TopicTreeAccordion) owns WHEN it shows (active users, post-chest,
 * cooldown-gated via rateAppPrompt.ts) and wires the store deep-link + analytics.
 * Mirrors Mod01WalkthroughPromptModal's look so it feels native to the app.
 */
export function RateAppPromptModal({
  visible,
  onRate,
  onLater,
}: RateAppPromptModalProps): React.ReactElement | null {
  if (!visible) return null;

  const handleRate = () => {
    successHaptic();
    onRate();
  };

  const handleLater = () => {
    tapHaptic();
    onLater();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleLater}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={FadeInUp.duration(360)} style={styles.card}>
            <View style={styles.heroWrap}>
              <ExpoImage
                source={FINN_DANCING}
                style={styles.hero}
                contentFit="contain"
                accessible={false}
              />
            </View>

            <Animated.View entering={FadeIn.delay(180).duration(360)}>
              <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
                אהבת את FinPlay?
              </Text>
              <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                דירוג קטן בחנות עוזר לעוד אנשים{'\n'}לגלות אותנו — ולוקח 10 שניות 💙
              </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(280).duration(360)} style={styles.ctaWrap}>
              <Pressable
                onPress={handleRate}
                style={[styles.cta, styles.ctaPrimary]}
                accessibilityRole="button"
                accessibilityLabel="לדרג בחנות"
              >
                <Star size={22} color="#ffffff" strokeWidth={2.4} fill="#ffffff" />
                <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                  לדרג בחנות
                </Text>
              </Pressable>
              <Pressable
                onPress={handleLater}
                style={[styles.cta, styles.ctaSecondary]}
                accessibilityRole="button"
                accessibilityLabel="אחר כך"
              >
                <Text style={[styles.ctaSecondaryText, RTL]} allowFontScaling={false}>
                  אחר כך
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
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
  },
  safe: {
    paddingHorizontal: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    shadowColor: '#0c4a6e',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  heroWrap: {
    alignSelf: 'center',
    marginBottom: 12,
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    padding: 8,
  },
  hero: {
    width: 96,
    height: 96,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0c4a6e',
    marginTop: 6,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#0e7490',
    fontWeight: '600',
    lineHeight: 22,
  },
  ctaWrap: {
    marginTop: 20,
    gap: 10,
  },
  cta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
  },
  ctaPrimary: {
    backgroundColor: '#0ea5e9',
    borderBottomWidth: 4,
    borderBottomColor: '#0284c7',
  },
  ctaSecondary: {
    backgroundColor: '#e0f2fe',
    borderBottomWidth: 2,
    borderBottomColor: '#bae6fd',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  ctaSecondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0c4a6e',
  },
});
