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
import { FINN_FIRE } from '../retention-loops/finnMascotConfig';
import { successHaptic, tapHaptic } from '../../utils/haptics';
import { track } from '../../lib/analytics/events';

const RTL_CENTER = { writingDirection: 'rtl' as const, textAlign: 'center' as const };
const RTL = { writingDirection: 'rtl' as const, textAlign: 'right' as const };

/** The three appointment slots ("מתי להזכיר?"). Picking one BEFORE the OS
 *  dialog is the micro-consent that turns a permission ask into a set
 *  appointment — the chosen hour is passed to requestPermission and becomes
 *  the streak-reminder hour (preferredReminderHour). */
const TIME_CHIPS = [
  { key: 'morning', label: 'בבוקר', time: '9:00', hour: 9 },
  { key: 'noon', label: 'בצהריים', time: '13:00', hour: 13 },
  { key: 'evening', label: 'בערב', time: '20:00', hour: 20 },
] as const;

function defaultChipForNow(): (typeof TIME_CHIPS)[number]['key'] {
  const h = new Date().getHours();
  if (h < 11) return 'morning';
  if (h < 16) return 'noon';
  return 'evening';
}

/**
 * Appointment-setting notification-permission primer (RETENTION-PLAN
 * 2026-07-02, approved by Yoav 2.7 — "לך על זה").
 *
 * History: built 2026-06-21 as a one-time prominent ask, retired 2026-06-22
 * in favour of the thin top banner ("באנר עליון דק"). The banner was then
 * measured: ~25-31 unique views/week → ~2 permission results/week, i.e. the
 * only channel capable of bringing a day-0 user back on day 1 stayed dark.
 * Revived as a "set an appointment" ritual: full-screen at the first-chest
 * value moment, time chips first ("מתי להזכיר?"), OS dialog only after the
 * user picked a slot — so a "later" never burns the one-shot iOS dialog.
 *
 * Gating: onboarding + walkthrough + (first chest OR mod-0-1), and waits for
 * the post-chest chest→Pro→register chain to fully clear so it never stacks
 * on the monetization moment (2026-06-25 decision D). Fires once per
 * lifetime (notifPromptShown); the thin learn-screen banner remains the
 * recurring 14-day fallback for everyone who said "אחר כך".
 *
 * Voice = system / plural per docs/BRAND.md.
 * Mounted globally in app/_layout.tsx; self-gates + self-dismisses.
 */
export function NotificationPermissionPrompt(): React.ReactElement | null {
  const permissionGranted = useNotificationStore((s) => s.permissionGranted);
  const requestPermission = useNotificationStore((s) => s.requestPermission);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);
  const hasSeenWalkthrough = useTutorialStore((s) => s.hasSeenAppWalkthrough);
  const notifPromptShown = useTutorialStore((s) => s.notifPromptShown);
  const markNotifPromptShown = useTutorialStore((s) => s.markNotifPromptShown);
  // Value-first gate, same as the banner (2026-06-26): the welcome chest is
  // the first guaranteed win EVERY new user reaches; mod-0-1 completion keeps
  // pre-welcome-chest users eligible. Never ask before value — an early iOS
  // denial is permanent.
  const firstChestOpened = useTutorialStore((s) => s.firstChestOpened);
  const hasCompletedFirstModule = useCompletedModulesStore((s) =>
    s.completedIds.includes('mod-0-1'),
  );
  // Never pop over the post-chest monetization chain (chest → Pro teaser →
  // register CTA, 2026-06-25 decision D) — wait until all three clear.
  const pendingFirstChest = useTutorialStore((s) => s.pendingPostWalkthroughFirstChest);
  const pendingProTeaser = useTutorialStore((s) => s.pendingPostWalkthroughProTeaser);
  const pendingRegisterCTA = useTutorialStore((s) => s.pendingPostWalkthroughCTA);

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
    (firstChestOpened || hasCompletedFirstModule) &&
    !pendingFirstChest &&
    !pendingProTeaser &&
    !pendingRegisterCTA;

  const [visible, setVisible] = useState(false);
  const [selectedChip, setSelectedChip] = useState<(typeof TIME_CHIPS)[number]['key']>(defaultChipForNow);
  // Fire exactly once per lifetime: mark shown immediately so a cold close
  // before acting doesn't re-pop it (the banner becomes the fallback).
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current || !eligible) return;
    firedRef.current = true;
    markNotifPromptShown();
    // Small breath after the chest/CTA chain clears so the map settles first.
    const t = setTimeout(() => {
      setVisible(true);
      try { track({ name: 'notification_banner_shown', props: { source: 'permission_modal' } }); } catch { /* non-fatal */ }
    }, 1200);
    return () => clearTimeout(t);
  }, [eligible, markNotifPromptShown]);

  const handleAllow = async () => {
    successHaptic();
    const chip = TIME_CHIPS.find((c) => c.key === selectedChip) ?? TIME_CHIPS[2];
    try { track({ name: 'reminder_time_selected', props: { hour: chip.hour, source: 'permission_modal' } }); } catch { /* non-fatal */ }
    try { track({ name: 'notification_banner_action', props: { source: 'permission_modal' } }); } catch { /* non-fatal */ }
    setVisible(false);
    await requestPermission('permission_modal', chip.hour);
  };

  const handleLater = () => {
    tapHaptic();
    try { track({ name: 'notification_banner_dismissed', props: { source: 'permission_modal' } }); } catch { /* non-fatal */ }
    // No bannerDismissed here — the thin banner stays live as the soft
    // fallback rung of the ask-ladder (primer → day-2 → banner).
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
                source={FINN_FIRE}
                style={styles.hero}
                contentFit="contain"
                accessible={false}
              />
            </View>

            <Animated.View entering={FadeIn.delay(180).duration(360)}>
              {/* Copy = Yoav verbatim (2026-07-02): persistence framing over
                  chest-FOMO — "growth comes from showing up, not from once". */}
              <Text style={[styles.title, RTL_CENTER]} allowFontScaling={false}>
                צמיחה אמיתית מגיעה מהתמדה
              </Text>
              <Text style={[styles.subtitle, RTL_CENTER]} allowFontScaling={false}>
                לא מפעם אחת. אשרו לי להזכיר לכם לשחק —{'\n'}2 דקות ביום, בשעה שתבחרו. בלי ספאם.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(240).duration(360)} style={styles.chipRow}>
              {TIME_CHIPS.map((chip) => {
                const selected = chip.key === selectedChip;
                return (
                  <Pressable
                    key={chip.key}
                    onPress={() => { tapHaptic(); setSelectedChip(chip.key); }}
                    style={[styles.chip, selected && styles.chipSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${chip.label} ${chip.time}`}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected, RTL_CENTER]} allowFontScaling={false}>
                      {chip.label}
                    </Text>
                    <Text style={[styles.chipTime, selected && styles.chipTimeSelected, RTL_CENTER]} allowFontScaling={false}>
                      {chip.time}
                    </Text>
                  </Pressable>
                );
              })}
            </Animated.View>

            <Animated.View entering={FadeIn.delay(300).duration(360)} style={styles.ctaWrap}>
              <Pressable
                onPress={handleAllow}
                style={[styles.cta, styles.ctaPrimary]}
                accessibilityRole="button"
                accessibilityLabel="תזכירו לי לשחק"
              >
                <Bell size={22} color="#ffffff" strokeWidth={2.4} />
                <Text style={[styles.ctaText, RTL]} allowFontScaling={false}>
                  תזכירו לי לשחק
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
  chipRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 10,
    marginTop: 18,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#e0f2fe',
  },
  chipSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0e7490',
  },
  chipLabelSelected: {
    color: '#0c4a6e',
  },
  chipTime: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#7dd3fc',
  },
  chipTimeSelected: {
    color: '#0284c7',
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
