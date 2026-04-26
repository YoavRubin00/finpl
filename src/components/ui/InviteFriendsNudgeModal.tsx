import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, {
  FadeInUp,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FINN_DANCING } from '../../features/retention-loops/finnMascotConfig';
import { useNudgeQueueStore } from '../../stores/useNudgeQueueStore';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { useEconomyStore } from '../../features/economy/useEconomyStore';
import { tapHaptic, successHaptic } from '../../utils/haptics';

const DAILY_COPY: Record<number, string> = {
  0: 'החברים שלכם מכניסים לכם כסף',
  1: 'כל חבר שמצטרף = מטבעות בכיס שלכם',
  2: 'החברים שלכם מכניסים לכם כסף',
  3: 'הזמנה אחת = מטבעות לכם וסטארט לחבר',
  4: 'כל חבר שמצטרף = מטבעות בכיס שלכם',
  5: 'שישי שמח — החברים שלכם מכניסים לכם כסף',
  6: 'שבת שלום — הזמנה אחת = מטבעות לכם ולחבר',
};

const MIN_DAYS_BETWEEN = 3;

function daysBetweenISO(aISO: string, bISO: string): number {
  const a = Date.parse(`${aISO}T00:00:00Z`);
  const b = Date.parse(`${bISO}T00:00:00Z`);
  if (!isFinite(a) || !isFinite(b)) return Infinity;
  return Math.floor(Math.abs(b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Periodic "invite friends" nudge — mirrors DailyBridgeNudgeModal in shape and
 * timing but fires every 3 days instead of daily, and defers when the Bridge
 * nudge has already shown today (we don't want two CTAs back-to-back).
 */
export function InviteFriendsNudgeModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const isGuest = useAuthStore((s) => s.isGuest);
  const profile = useAuthStore((s) => s.profile);

  const activeDates = useEconomyStore((s) => s.activeDates);

  const recordAct = useNudgeQueueStore((s) => s.recordAct);
  const recordDismiss = useNudgeQueueStore((s) => s.recordDismiss);
  const recordShown = useNudgeQueueStore((s) => s.recordShown);
  const lastInviteNudgeDateISO = useNudgeQueueStore((s) => s.lastInviteNudgeDateISO);
  const setLastInviteNudgeDateISO = useNudgeQueueStore((s) => s.setLastInviteNudgeDateISO);
  const lastBridgeNudgeDateISO = useNudgeQueueStore((s) => s.lastBridgeNudgeDateISO);

  // Track current route so we can gate the nudge to fire only on the feed.
  // Read via ref inside the interval callback so we always see the latest path.
  const segments = useSegments();
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    if (!isAuthenticated || !hasCompletedOnboarding) return;
    if (isGuest) return;
    if (profile?.ageGroup === 'minor') return;
    if ((activeDates?.length ?? 0) < 3) return;

    const today = new Date().toISOString().slice(0, 10);
    if (lastInviteNudgeDateISO && daysBetweenISO(lastInviteNudgeDateISO, today) < MIN_DAYS_BETWEEN) return;
    if (lastBridgeNudgeDateISO === today) return; // defer if Bridge already fired today

    const MIN_SESSION_MS = 60 * 1000; // 1 min after app open
    const STREAK_WAIT_GRACE_MS = 15 * 1000;

    const tryShow = () => {
      if (shownRef.current) return;
      const s = useNudgeQueueStore.getState();
      if (s.inLesson) return;
      // Only fire while the user is on the feed tab — never on other screens.
      const seg = segmentsRef.current as string[];
      if (seg[0] !== '(tabs)' || seg[1] !== 'learn') return;
      if (!s.canShow('referral')) return;
      const sessionAge = Date.now() - s.sessionStartedAt;
      if (sessionAge < MIN_SESSION_MS) return;
      if (!s.streakShownThisSession && sessionAge < MIN_SESSION_MS + STREAK_WAIT_GRACE_MS) return;
      // Defer if Bridge fired today (post-rehydrate check via store)
      if (s.lastBridgeNudgeDateISO === today) return;
      shownRef.current = true;
      setVisible(true);
    };

    const initial = setTimeout(tryShow, 5_000);
    const interval = setInterval(tryShow, 15_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [isAuthenticated, hasCompletedOnboarding, isGuest, profile, activeDates, lastInviteNudgeDateISO, lastBridgeNudgeDateISO]);

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

  const glowAnim = useSharedValue(0.5);
  useEffect(() => {
    if (!visible || reducedMotion) return;
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 950 }),
        withTiming(0.5, { duration: 950 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(glowAnim);
  }, [visible, reducedMotion, glowAnim]);
  const glowStyle = useAnimatedStyle(() => ({ shadowOpacity: glowAnim.value }));

  const today = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date().getDay();

  function handleAct() {
    successHaptic();
    recordAct('referral');
    recordShown('referral');
    setLastInviteNudgeDateISO(today);
    setVisible(false);
    router.push('/referral');
  }

  function handleDismiss() {
    tapHaptic();
    recordDismiss('referral');
    recordShown('referral');
    setLastInviteNudgeDateISO(today);
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
          <Pressable
            onPress={handleDismiss}
            style={[styles.closeBtn, { top: Math.max(14, insets.top - 6) }]}
            accessibilityRole="button"
            accessibilityLabel="סגור"
            hitSlop={12}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Animated.View style={[styles.sharkWrap, bobStyle]}>
            <ExpoImage
              source={FINN_DANCING}
              style={styles.sharkImg}
              contentFit="contain"
              accessible={false}
            />
          </Animated.View>

          <Text style={styles.title}>{DAILY_COPY[dayOfWeek]}</Text>

          <Text style={styles.subtitle}>
            כל הזמנה מכניסה לכם מטבעות, ולחבר/ה סטארט סופר. הכי כיף ביחד.
          </Text>

          <Animated.View style={[styles.ctaGlowWrap, glowStyle]}>
            <Pressable
              onPress={handleAct}
              accessibilityRole="button"
              accessibilityLabel="הזמן חברים"
            >
              {({ pressed }) => (
                <View style={[
                  styles.ctaBtn,
                  pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] }
                ]}>
                  <Text style={styles.ctaText}>הזמן חברים</Text>
                  <Text style={styles.ctaEmoji}>💰</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

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
  ctaGlowWrap: {
    width: '100%',
    borderRadius: 18,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 0,
    marginBottom: 14,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderBottomWidth: 5,
    borderBottomColor: '#1d4ed8',
    overflow: 'hidden',
    elevation: 12,
  },
  ctaEmoji: {
    fontSize: 26,
    lineHeight: 30,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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