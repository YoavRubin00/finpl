import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Bell } from 'lucide-react-native';
import { useNotificationStore } from './useNotificationStore';
import { useAuthStore } from '../auth/useAuthStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useCompletedModulesStore } from '../economy/useCompletedModulesStore';
import { FINN_STANDARD } from '../retention-loops/finnMascotConfig';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import { track } from '../../lib/analytics/events';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/**
 * One-time, PROMINENT Captain-Shark notification-permission prompt (Yoav
 * 2026-06-21: "the banner isn't visible enough — make sure users get a
 * one-time prompt to allow notifications"). The thin top
 * `NotificationPermissionBanner` was easy to miss; this modal guarantees a
 * single, unmissable ask at a positive moment (after the first module), then
 * hands re-asks back to the recurring banner (which is gated on
 * `notifPromptShown` so the two never both fire on the first ask).
 *
 * Voice = system / plural per docs/BRAND.md ("התראות פנים-אפליקציה … רבים").
 * Render once near the learn-screen banners; self-gates + self-dismisses.
 */
export function NotificationPermissionPrompt(): React.ReactElement | null {
  const permissionGranted = useNotificationStore((s) => s.permissionGranted);
  const requestPermission = useNotificationStore((s) => s.requestPermission);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const notifPromptShown = useTutorialStore((s) => s.notifPromptShown);
  const markNotifPromptShown = useTutorialStore((s) => s.markNotifPromptShown);
  // Same value-first gate as the banner: never ask before the user has felt
  // the product (first module done), or the OS denial is permanent.
  const hasCompletedFirstModule = useCompletedModulesStore((s) =>
    s.completedIds.includes('mod-0-1'),
  );

  // Reconcile the cached flag with the real OS state so a stale
  // permissionGranted=true doesn't suppress the prompt forever.
  useEffect(() => {
    void useNotificationStore.getState().syncPermissionStatus();
  }, []);

  const eligible =
    !permissionGranted &&
    !notifPromptShown &&
    hasCompletedOnboarding &&
    hasSeenWalkthrough &&
    hasCompletedFirstModule;

  const [visible, setVisible] = useState(false);
  // Fire exactly once per lifetime: mark shown immediately so a cold close
  // before acting doesn't re-pop it (the banner becomes the fallback).
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current || !eligible) return;
    firedRef.current = true;
    markNotifPromptShown();
    setVisible(true);
    try { track({ name: 'notification_banner_shown', props: { source: 'permission_modal' } }); } catch { /* non-fatal */ }
  }, [eligible, markNotifPromptShown]);

  const handleAllow = async () => {
    successHaptic();
    try { track({ name: 'notification_banner_action', props: { source: 'permission_modal' } }); } catch { /* non-fatal */ }
    setVisible(false);
    await requestPermission('permission_modal');
  };

  const handleLater = () => {
    tapHaptic();
    try { track({ name: 'notification_banner_dismissed', props: { source: 'permission_modal' } }); } catch { /* non-fatal */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleLater}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <Animated.View entering={FadeInUp.duration(360)} style={styles.card}>
            <View style={styles.heroWrap}>
              <ExpoImage
                source={FINN_STANDARD}
                style={styles.hero}
                contentFit="contain"
                accessible={false}
              />
            </View>

            <Animated.View entering={FadeIn.delay(180).duration(360)}>
              <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
                אל תפספסו אותי
              </Text>
              <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                אשרו התראות ואשמור לכם על הרצף, אזכיר כשתיבה מחכה,{'\n'}ואצוף עם טיפ פיננסי ליום. בלי ספאם — מילה של קפטן.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(280).duration(360)} style={styles.ctaWrap}>
              <Pressable
                onPress={handleAllow}
                style={[styles.cta, styles.ctaPrimary]}
                accessibilityRole="button"
                accessibilityLabel="אשרו התראות"
              >
                <Bell size={22} color="#ffffff" strokeWidth={2.4} />
                <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                  אשרו התראות
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
