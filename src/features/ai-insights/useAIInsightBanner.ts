import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useIsPro } from '../subscription/useSubscription';
import { useWeeklyInsightStore } from './useWeeklyInsightStore';
import { useAuthStore } from '../auth/useAuthStore';
import { useEconomyStore } from '../economy/useEconomyStore';
import { useChapterStore } from '../chapter-1-content/useChapterStore';
import { MODULE_NAMES } from '../chat/chatData';
import { getApiBase } from '../../db/apiBase';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { useBannerCooldownStore } from '../notifications/useBannerCooldownStore';

const DEFAULT_BANNER_MSG = 'יש לי תובנה חדשה עבורכם';

async function fetchBannerTip(): Promise<string | null> {
  try {
    const auth = useAuthStore.getState();
    const eco = useEconomyStore.getState();
    const allModuleIds = Object.values(useChapterStore.getState().progress)
      .flatMap((cp) => cp.completedModules);
    const lastModuleName = allModuleIds.length > 0
      ? (MODULE_NAMES[allModuleIds[allModuleIds.length - 1]] ?? null)
      : null;

    const res = await fetch(`${getApiBase()}/api/ai/banner-tip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: auth.displayName ?? 'חבר',
        xp: eco.xp,
        streak: eco.streak,
        completedModuleCount: allModuleIds.length,
        lastModuleName,
        financialGoal: auth.profile?.financialGoal,
      }),
    });

    const data = (await res.json()) as { ok: boolean; message: string };
    if (!res.ok || !data.ok) return null;
    return data.message ?? null;
  } catch {
    return null;
  }
}

export function useAIInsightBanner() {
  const router = useRouter();
  const isPro = useIsPro();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(DEFAULT_BANNER_MSG);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Hard gate: no top banners during onboarding or initial walkthrough.
    if (!useAuthStore.getState().hasCompletedOnboarding) return;
    if (!useTutorialStore.getState().hasSeenAppWalkthrough) return;

    const store = useWeeklyInsightStore.getState();
    if (!store.shouldShowBanner(isPro)) return;

    // Use cached message immediately so banner has content on mount
    if (store.bannerMessage) setMessage(store.bannerMessage);

    // Background-fetch a fresh message if stale
    if (!fetchedRef.current && store.shouldRefetchBannerMessage()) {
      fetchedRef.current = true;
      fetchBannerTip().then((msg) => {
        if (msg) {
          store.saveBannerMessage(msg);
          setMessage(msg);
        }
      });
    }

    // Defer to the global cooldown so we never overlap another top banner.
    const baseDelay = 2500;
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
    useWeeklyInsightStore.getState().markBannerShown();
  }, []);

  const navigate = useCallback(() => {
    dismiss();
    router.push('/ai-insights' as never);
  }, [dismiss, router]);

  return { visible, dismiss, navigate, message };
}
