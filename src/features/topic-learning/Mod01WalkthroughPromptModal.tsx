import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Compass, BookOpen } from 'lucide-react-native';
import { FINN_HELLO } from '../retention-loops/finnMascotConfig';
import { successHaptic, tapHaptic } from '../../utils/haptics';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface Mod01WalkthroughPromptModalProps {
  visible: boolean;
  /** User picked "סיור באפליקציה" — fire the AppWalkthroughOverlay. */
  onTakeTour: () => void;
  /** User picked "המשך ללמוד" — skip the tour, jump straight to the
   *  post-tour Pro / register / push-permission chain. */
  onContinueLearning: () => void;
}

/**
 * One-shot prompt that fires the first time the user crosses ~30% of
 * mod-0-1 (intro + cards + ~one more chip done). Offers the in-app
 * tour OR lets them skip directly into the Pro funnel.
 *
 * Yoav R7 2026-06-10: "לאחר ביצוע של עוד רכבי ב-0-1, יפתח לו קריאה
 * לבצע את ההיכרות עם האפליקציה, או להמשיך ללמוד".
 */
export function Mod01WalkthroughPromptModal({
  visible,
  onTakeTour,
  onContinueLearning,
}: Mod01WalkthroughPromptModalProps): React.ReactElement | null {
  if (!visible) return null;

  const handleTour = () => {
    successHaptic();
    onTakeTour();
  };

  const handleContinue = () => {
    tapHaptic();
    onContinueLearning();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={FadeInUp.duration(360)} style={styles.card}>
            <View style={styles.heroWrap}>
              <ExpoImage
                source={FINN_HELLO}
                style={styles.hero}
                contentFit="contain"
                accessible={false}
              />
            </View>

            <Animated.View entering={FadeIn.delay(180).duration(360)}>
              <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
                כל הכבוד! התקדמת יפה 🎉
              </Text>
              <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                עוד שנייה לפני שנמשיך —{'\n'}רוצה סיור קצר באפליקציה?
              </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(280).duration(360)} style={styles.ctaWrap}>
              <Pressable
                onPress={handleTour}
                style={[styles.cta, styles.ctaPrimary]}
                accessibilityRole="button"
                accessibilityLabel="סיור באפליקציה"
              >
                <Compass size={22} color="#ffffff" strokeWidth={2.4} />
                <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                  סיור באפליקציה
                </Text>
              </Pressable>
              <Pressable
                onPress={handleContinue}
                style={[styles.cta, styles.ctaSecondary]}
                accessibilityRole="button"
                accessibilityLabel="המשך ללמוד"
              >
                <BookOpen size={20} color="#0c4a6e" strokeWidth={2.4} />
                <Text style={[styles.ctaSecondaryText, RTL]} allowFontScaling={false}>
                  המשך ללמוד
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
    backgroundColor: '#0e7490',
    borderBottomWidth: 4,
    borderBottomColor: '#155e75',
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
