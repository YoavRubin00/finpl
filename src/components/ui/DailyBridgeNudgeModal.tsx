import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  FadeInUp,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FINN_DANCING } from '../../features/retention-loops/finnMascotConfig';
import { LottieIcon } from './LottieIcon';
import { useNudgeQueueStore } from '../../stores/useNudgeQueueStore';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { useEconomyStore } from '../../features/economy/useEconomyStore';
import { tapHaptic, successHaptic } from '../../utils/haptics';

const LOTTIE_BRIDGE = require('../../../assets/lottie/wired-flat-1925-bridge-hover-pinch.json') as number;

const DAILY_COPY: Record<number, string> = {
  0: 'בנית בסיס חזק. הגיע הזמן להשתמש בו',
  1: 'עשינו דרך יפה ביחד. בוא נעבור לעולם האמיתי',
  2: 'הידע שלך שווה כסף אמיתי. בוא נאמת את זה',
  3: 'חיסכון ראשון? השקעה ראשונה? הגשר פתוח בשבילך',
  4: 'ידע לבד לא מספיק — צריך לפעול. בוא לגשר',
  5: 'שישי מעולה לפתוח חיסכון אמיתי. 5 דקות זה הכל',
  6: 'שבת שלום. הזמן הנכון לסקור את האפשרויות שלך',
};

export function DailyBridgeNudgeModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  // Auth / profile guards
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const isGuest = useAuthStore((s) => s.isGuest);
  const profile = useAuthStore((s) => s.profile);

  // Activity gate — need ≥3 active days before nudging
  const activeDates = useEconomyStore((s) => s.activeDates);

  // Nudge queue
  const canShow = useNudgeQueueStore((s) => s.canShow);
  const recordAct = useNudgeQueueStore((s) => s.recordAct);
  const recordDismiss = useNudgeQueueStore((s) => s.recordDismiss);
  const recordShown = useNudgeQueueStore((s) => s.recordShown);
  const lastBridgeNudgeDateISO = useNudgeQueueStore((s) => s.lastBridgeNudgeDateISO);
  const setLastBridgeNudgeDateISO = useNudgeQueueStore((s) => s.setLastBridgeNudgeDateISO);

  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    if (!isAuthenticated || !hasCompletedOnboarding) return;
    if (isGuest) return;
    if (profile?.ageGroup === 'minor') return;
    if ((activeDates?.length ?? 0) < 3) return;

    const today = new Date().toISOString().slice(0, 10);
    if (lastBridgeNudgeDateISO === today) return;
    if (!canShow('bridge')) return;

    shownRef.current = true;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [isAuthenticated, hasCompletedOnboarding, isGuest, profile, activeDates, lastBridgeNudgeDateISO, canShow]);

  // Shark bob animation
  const bobY = useSharedValue(0);
  const bobStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bobY.value }],
  }));

  useEffect(() => {
    if (!visible || reducedMotion) return;
    bobY.value = withRepeat(
      withTiming(-10, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(bobY);
  }, [visible, reducedMotion, bobY]);

  const today = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date().getDay();

  function handleAct() {
    successHaptic();
    recordAct('bridge');
    recordShown('bridge');
    setLastBridgeNudgeDateISO(today);
    setVisible(false);
    router.push('/bridge');
  }

  function handleDismiss() {
    tapHaptic();
    recordDismiss('bridge');
    recordShown('bridge');
    setLastBridgeNudgeDateISO(today);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeInUp.duration(400).springify().damping(14)}
          style={[styles.card, { paddingBottom: Math.max(28, insets.bottom + 16) }]}
        >
          {/* Close ✕ */}
          <Pressable
            onPress={handleDismiss}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="סגור"
            hitSlop={12}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          {/* Dancing shark */}
          <Animated.View style={[styles.sharkWrap, bobStyle]}>
            <ExpoImage
              source={FINN_DANCING}
              style={styles.sharkImg}
              contentFit="contain"
              accessible={false}
            />
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{DAILY_COPY[dayOfWeek]}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            הגשר שלנו — הטבות אמיתיות מחברות ישראליות מובילות
          </Text>

          {/* CTA button */}
          <Pressable
            onPress={handleAct}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.88 }]}
            accessibilityRole="button"
            accessibilityLabel="קח אותי לגשר"
          >
            <LottieIcon
              source={LOTTIE_BRIDGE}
              size={32}
              autoPlay
              loop
            />
            <Text style={styles.ctaText}>קח אותי לגשר</Text>
          </Pressable>

          {/* Dismiss */}
          <Pressable
            onPress={handleDismiss}
            style={styles.dismissBtn}
            accessibilityRole="button"
            accessibilityLabel="אחר כך"
            hitSlop={10}
          >
            <Text style={styles.dismissText}>אחר כך</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3,7,18,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0f172a',
    borderRadius: 28,
    paddingTop: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(14,165,233,0.35)',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    left: 16,
    padding: 6,
  },
  closeText: {
    fontSize: 20,
    color: '#475569',
    fontWeight: '700',
  },
  sharkWrap: {
    marginBottom: 20,
  },
  sharkImg: {
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#facc15',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 32,
    marginBottom: 10,
    textShadowColor: 'rgba(250,204,21,0.3)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 22,
    marginBottom: 28,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    width: '100%',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0369a1',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 14,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
  },
  dismissBtn: {
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    writingDirection: 'rtl',
  },
});
