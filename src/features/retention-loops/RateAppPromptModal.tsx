import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { ThumbsUp, ThumbsDown, Star } from 'lucide-react-native';
import { FINN_DANCING } from './finnMascotConfig';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import { track } from '../../lib/analytics/events';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { requestNativeReview } from '../../lib/requestNativeReview';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

interface RateAppPromptModalProps {
  visible: boolean;
  /** Called when the flow ends — rated, feedback submitted, or dismissed. */
  onClose: () => void;
  moduleId?: string;
}

/**
 * Duolingo-style rate flow (Yoav 2026-06-27), Captain-Shark branded + premium.
 * Step 1 asks SENTIMENT ("נהנית מ-FinPlay?"). 👍 → the OS NATIVE in-app review
 * sheet (requestNativeReview, which falls back to the store deep-link when the
 * native sheet is unavailable) — happy users rate WITHOUT leaving the app. 👎 →
 * an in-app feedback step (NOT the store), keeping low ratings off the store.
 * `markRated()` (never-ask-again) fires only on a real outcome (rate or
 * feedback); a bare dismiss just lets the cooldown re-ask later. The parent
 * (TopicTreeAccordion) owns WHEN it shows (rateAppPrompt.ts gating).
 */
export function RateAppPromptModal({ visible, onClose, moduleId }: RateAppPromptModalProps): React.ReactElement | null {
  const [step, setStep] = useState<'sentiment' | 'feedback'>('sentiment');
  const [feedback, setFeedback] = useState('');

  if (!visible) return null;

  const finish = () => {
    setStep('sentiment');
    setFeedback('');
    onClose();
  };

  const handlePositive = () => {
    successHaptic();
    try { track({ name: 'rate_sentiment_selected', props: { sentiment: 'positive', module_id: moduleId } }); } catch { /* non-fatal */ }
    useTutorialStore.getState().markRated();
    void requestNativeReview({ moduleId });
    finish();
  };

  const handleNegative = () => {
    tapHaptic();
    try { track({ name: 'rate_sentiment_selected', props: { sentiment: 'negative', module_id: moduleId } }); } catch { /* non-fatal */ }
    setStep('feedback');
  };

  const submitFeedback = () => {
    tapHaptic();
    const text = feedback.trim();
    try { track({ name: 'rate_feedback_submitted', props: { text: text || undefined, module_id: moduleId } }); } catch { /* non-fatal */ }
    useTutorialStore.getState().markRated();
    finish();
  };

  const dismiss = () => {
    tapHaptic();
    try { track({ name: 'rate_prompt_cta_tapped', props: { action: 'later', module_id: moduleId } }); } catch { /* non-fatal */ }
    finish();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={FadeInUp.springify().damping(16).stiffness(150)} style={styles.card}>
            {/* Captain Shark with a gaming-neon glow halo */}
            <View style={styles.heroWrap}>
              <LinearGradient
                colors={['rgba(34,211,238,0.55)', 'rgba(14,165,233,0.0)']}
                start={{ x: 0.5, y: 0.1 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.heroGlow}
              />
              <ExpoImage source={FINN_DANCING} style={styles.hero} contentFit="contain" accessible={false} />
            </View>

            {step === 'sentiment' ? (
              <Animated.View entering={FadeIn.delay(120).duration(320)}>
                {/* Gold 5-star flourish */}
                <Animated.View entering={ZoomIn.delay(220).springify().damping(12)} style={styles.starsRow}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={24} color="#fbbf24" fill="#fbbf24" strokeWidth={0} />
                  ))}
                </Animated.View>
                <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>נהנית עד עכשיו?</Text>
                <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                  אני, קפטן שארק, באמת רוצה לדעת — זה עוזר לי להשתפר ולהביא עוד אנשים על הסיפון.
                </Text>
                <View style={styles.ctaWrap}>
                  <Pressable onPress={handlePositive} style={styles.ctaPrimaryWrap} accessibilityRole="button" accessibilityLabel="כן, אהבתי">
                    <LinearGradient colors={['#22d3ee', '#0ea5e9', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cta, styles.ctaPrimaryGrad]}>
                      <ThumbsUp size={22} color="#ffffff" strokeWidth={2.6} />
                      <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>כן, אהבתי!</Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable onPress={handleNegative} style={[styles.cta, styles.ctaSecondary]} accessibilityRole="button" accessibilityLabel="לא ממש">
                    <ThumbsDown size={20} color="#0c4a6e" strokeWidth={2.4} />
                    <Text style={[styles.ctaSecondaryText, RTL]} allowFontScaling={false}>לא ממש</Text>
                  </Pressable>
                </View>
                <Pressable onPress={dismiss} style={styles.laterLink} accessibilityRole="button" accessibilityLabel="אחר כך">
                  <Text style={[styles.laterText, RTL_CENTER]} allowFontScaling={false}>אחר כך</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(280)}>
                <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>מה לתקן?</Text>
                <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                  ספר לי בכנות — אני קורא כל מילה, וזה מה שעוזר לי להשתפר בשבילך.
                </Text>
                <TextInput
                  value={feedback}
                  onChangeText={setFeedback}
                  placeholder="כתוב כאן (אופציונלי)…"
                  placeholderTextColor="#94a3b8"
                  multiline
                  style={styles.input}
                  textAlign="right"
                  maxLength={500}
                />
                <View style={styles.ctaWrap}>
                  <Pressable onPress={submitFeedback} style={styles.ctaPrimaryWrap} accessibilityRole="button" accessibilityLabel="שליחה">
                    <LinearGradient colors={['#22d3ee', '#0ea5e9', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cta, styles.ctaPrimaryGrad]}>
                      <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>שליחה</Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable onPress={submitFeedback} style={[styles.cta, styles.ctaSecondary]} accessibilityRole="button" accessibilityLabel="דלג">
                    <Text style={[styles.ctaSecondaryText, RTL]} allowFontScaling={false}>דלג</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 15, 30, 0.82)',
    justifyContent: 'center',
  },
  safe: {
    paddingHorizontal: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingVertical: 24,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: '#bae6fd',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  heroWrap: {
    alignSelf: 'center',
    marginBottom: 10,
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
  },
  hero: {
    width: 110,
    height: 110,
  },
  starsRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0c4a6e',
    marginTop: 2,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#0e7490',
    fontWeight: '600',
    lineHeight: 22,
  },
  input: {
    marginTop: 14,
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    writingDirection: 'rtl',
    textAlignVertical: 'top',
  },
  ctaWrap: {
    marginTop: 20,
    gap: 10,
  },
  ctaPrimaryWrap: {
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: '#1d4ed8',
    overflow: 'hidden',
  },
  cta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
  },
  ctaPrimaryGrad: {
    borderRadius: 13,
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
  laterLink: {
    marginTop: 14,
    paddingVertical: 6,
    alignItems: 'center',
  },
  laterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
});