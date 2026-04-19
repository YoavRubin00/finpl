import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSubscriptionStore } from '../subscription/useSubscriptionStore';
import { useMonetizationIntentStore } from './useMonetizationIntentStore';
import { pickUpgradeNudgeCopy } from './monetizationNotificationCopy';

export function useUpgradeNudgeBanner() {
  const router = useRouter();
  const isPro = useSubscriptionStore((s) => s.tier === 'pro' && s.status === 'active');
  const [visible, setVisible] = useState(false);
  const [copy, setCopy] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    if (isPro) return;
    const intentStore = useMonetizationIntentStore.getState();
    if (!intentStore.canSendUpgradeNotif()) return;

    const lastFeature = intentStore.getLastTappedFeature();
    setCopy(pickUpgradeNudgeCopy(lastFeature));

    // Delay slightly more than AI insight banner (2500ms) to avoid overlap
    const t = setTimeout(() => setVisible(true), 4000);
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
