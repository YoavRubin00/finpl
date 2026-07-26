/**
 * ProPromoExpiringBanner — gentle in-app nudge (NOT push) when a PROMOTIONAL
 * Pro grant is about to expire: ≤3 days left per pro_expires_at from
 * /api/sync/subscription (Yoav 2026-07-26).
 *
 * Thin wrapper around the shared NotificationBanner base, mirroring
 * BridgeCTABanner so it positions + coordinates (banner-cooldown slot + global
 * popup stage) identically with the other top banners and never overlaps them.
 *
 * Gates (all must pass before render):
 *  1. isPro + proSource === 'promotional' + proExpiresAt within (0, 3] days.
 *  2. Max once per IL calendar day (useUsageStore.promoExpiryBannerLastShownDate,
 *     marked at SHOW time — not dismissal — so it's a hard daily cap).
 *  3. ≥ 5s on this mount, then the global banner-cooldown + popup slots.
 *
 * CTA routes to /pricing so the user can keep Pro with a real subscription.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { useBannerCooldownStore } from "../notifications/useBannerCooldownStore";
import { useNudgeQueueStore } from "../../stores/useNudgeQueueStore";
import { NotificationBanner } from "../../components/ui/NotificationBanner";
import { FINN_HAPPY } from "../retention-loops/finnMascotConfig";
import { captureEvent } from "../../lib/posthog";
import { israelDayKey } from "../../utils/dateUtils";
import { useSubscription } from "./useSubscription";
import { useUsageStore } from "./useUsageStore";

const PRESENCE_DELAY_MS = 5_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS_LEFT = 3;

function daysLeftLabel(daysLeft: number): string {
  if (daysLeft <= 1) return "מתנת ה-Pro שלכם נגמרת היום — נשארים במים העמוקים?";
  if (daysLeft === 2) return "מתנת ה-Pro שלכם נגמרת בעוד יומיים — נשארים במים העמוקים?";
  return `מתנת ה-Pro שלכם נגמרת בעוד ${daysLeft} ימים — נשארים במים העמוקים?`;
}

export function ProPromoExpiringBanner() {
  const router = useRouter();
  const { data: subscription } = useSubscription();
  const lastShownDate = useUsageStore((s) => s.promoExpiryBannerLastShownDate);
  const markShownToday = useUsageStore((s) => s.markPromoExpiryBannerShown);

  const [visible, setVisible] = useState(false);
  const trackedShownRef = useRef(false);

  const expiresAt = subscription?.proExpiresAt ?? null;
  const msLeft = expiresAt ? new Date(expiresAt).getTime() - Date.now() : -1;
  const daysLeft = Math.ceil(msLeft / DAY_MS);

  const eligible =
    subscription?.isPro === true &&
    subscription.proSource === "promotional" &&
    msLeft > 0 &&
    daysLeft <= MAX_DAYS_LEFT &&
    lastShownDate !== israelDayKey();

  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }

    // 1) 5s presence before becoming a candidate (avoid flashing on transit).
    // 2) Then wait for the shared banner-cooldown slot + the global popup
    //    stage so we never overlap the other banners / launch popups.
    let slotTimer: ReturnType<typeof setTimeout> | undefined;
    const presenceTimer = setTimeout(() => {
      const bannerSlot = useBannerCooldownStore.getState().msUntilNextSlot();
      const seqDelay = Math.max(0, useNudgeQueueStore.getState().popupBusyUntil - Date.now());
      const slotDelay = Math.max(bannerSlot, seqDelay);
      slotTimer = setTimeout(() => {
        setVisible(true);
        useBannerCooldownStore.getState().markShown();
        useNudgeQueueStore.getState().takePopupSlot();
        // Hard once-a-day cap — marked on SHOW, not on dismissal.
        markShownToday();
        if (!trackedShownRef.current) {
          trackedShownRef.current = true;
          captureEvent("pro_promo_expiring_seen", {
            source: "home",
            days_left: daysLeft,
            expires_at: expiresAt,
          });
        }
      }, slotDelay);
    }, PRESENCE_DELAY_MS);

    return () => {
      clearTimeout(presenceTimer);
      if (slotTimer) clearTimeout(slotTimer);
    };
  }, [eligible, daysLeft, expiresAt, markShownToday]);

  const handleOpen = () => {
    captureEvent("pro_promo_expiring_tapped", { source: "home", days_left: daysLeft });
    setVisible(false);
    router.push("/pricing?source=promo_expiry_banner" as never);
  };

  const handleDismiss = () => {
    captureEvent("pro_promo_expiring_dismissed", { source: "home", days_left: daysLeft });
    setVisible(false);
  };

  return (
    <NotificationBanner
      visible={visible}
      message={daysLeftLabel(daysLeft)}
      actionLabel="להישאר ב-Pro"
      onAction={handleOpen}
      onDismiss={handleDismiss}
      duration={0}
      imageSource={FINN_HAPPY}
    />
  );
}
