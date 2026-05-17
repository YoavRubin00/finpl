import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import { useMonetizationIntentStore } from './useMonetizationIntentStore';
import { pickUpgradeNudgeCopy } from './monetizationNotificationCopy';
import { useAuthStore } from '../auth/useAuthStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useBannerCooldownStore } from '../notifications/useBannerCooldownStore';

export function useUpgradeNudgeBanner() {
  const router = useRouter();
  const isPro = useSubscriptionStore((s) => s.tier === 'pro' && s.status === 'active');
  const [visible, setVisible] = useState(false);
  const [copy, setCopy] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    // Hard gate: no top banners during onboarding or initial walkthrough.
    if (!useAuthStore.getState().hasCompletedOnboarding) return;
    if (!useTutorialStore.getState().hasSeenAppWalkthrough) return;

    if (isPro) return;
    const intentStore = useMonetizationIntentStore.getState();
    if (!intentStore.canSendUpgradeNotif()) return;

    const lastFeature = intentStore.getLastTappedFeature();
    setCopy(pickUpgradeNudgeCopy(lastFeature));

    // Base 4s + whatever the shared top-banner cooldown still owes us.
    const baseDelay = 4000;
    const cooldownDelay = useBannerCooldownStore.getState().msUntilNextSlot();
    const t = setTimeout(() => {
      setVisible(true);
      useBannerCooldownStore.getState().markShown();
    }, baseDelay + cooldownDelay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    useMonetizationIntentStore.getState().markUpgradeNotifSent();
  }, []);

  const navigate = useCallback(() => {
    dismiss();
    router.push('/pricing' as never);
  }, [dismiss, router]);

  return { visible, dismiss, navigate, copy };
}
