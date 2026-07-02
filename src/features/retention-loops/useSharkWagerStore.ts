import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';
import { track } from '../../lib/analytics/events';
import { queryClient } from '../../lib/queryClient';
import { economyQueryKey } from '../economy/useEconomy';
import { fireEconomyDelta, useEconomyUIStore } from '../economy/useEconomyUIStore';
import { useNotificationStore } from '../notifications/useNotificationStore';
import type { Economy } from '../../lib/api/economy';

/**
 * "ההתערבות של הכריש" — the day-0 commitment wager (RETENTION-PLAN 2026-07-02,
 * approved by Yoav; priced by מוני, taste-gated by אודרי):
 *
 *   The user puts 50 coins in escrow at the end of the first session; Captain
 *   Shark puts 100. Come back tomorrow (IL calendar day, same clock as the
 *   streak) and complete any daily activity → collect 150. Don't → the 50
 *   stays with the shark. No randomness — the user's own action decides, so
 *   this is a commitment device, not a gamble (אודרי: GO-with-conditions).
 *
 * Hard rules (all three signed off):
 *   - ONE offer per lifetime, day-0 only. No retry after a loss, no
 *     "win it back", no repeat ladder (loss-chasing is the one forbidden
 *     pattern with no appeal).
 *   - Escrow at accept: the 50 leaves the balance immediately (endowment).
 *   - Offer is skipped entirely when balance < stake — never discounted,
 *     never linked to the shop/gems.
 *   - Resolution by IL calendar day, exactly like the streak.
 */

export const WAGER_STAKE = 50;
export const WAGER_PAYOUT = 150; // gross back on a win (net +100)

// IL-zoned date, duplicated from useEconomyUIStore's todayISO (module-private
// there) — the wager MUST tick on the same calendar as activeDates or a user
// near midnight could "return tomorrow" and still lose.
const IL_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function todayILISO(): string {
  return IL_DATE_FMT.format(new Date());
}

/** The IL calendar day after `dateISO`. Noon-anchored to dodge DST edges. */
function nextDayILISO(dateISO: string): string {
  const noon = new Date(`${dateISO}T12:00:00`);
  return IL_DATE_FMT.format(new Date(noon.getTime() + 24 * 60 * 60 * 1000));
}

interface PendingWager {
  /** IL date the wager was placed (day 0). Win day = the next IL day. */
  date: string;
  stake: number;
  payout: number;
}

interface WagerResolution {
  outcome: 'won' | 'lost';
  stake: number;
  payout: number;
}

interface SharkWagerState {
  /** Stamped the moment the offer modal SHOWS — one offer per lifetime,
   *  even if the app is killed before the user answers. */
  offerConsumedAt: string | null;
  wager: PendingWager | null;
  /** Set by resolveWagerIfDue; the host shows the win/loss modal once and
   *  then clears it. Coins for a win are granted at resolve time. */
  lastResolution: WagerResolution | null;
}

interface SharkWagerActions {
  markOfferConsumed: () => void;
  /** Escrows the stake and arms the wager. Returns false when the balance
   *  can't cover the stake (the host should never offer in that case, this
   *  is the last-line guard). */
  placeWager: () => boolean;
  declineWager: () => void;
  /** Idempotent. Call on app open / foreground / daily-task completion:
   *  win  — activeDates contains the win day → grant payout, stash resolution;
   *  loss — the win day passed without activity → stash resolution;
   *  else — still pending (win day not over yet). */
  resolveWagerIfDue: () => void;
  clearResolution: () => void;
  reset: () => void;
}

export const useSharkWagerStore = create<SharkWagerState & SharkWagerActions>()(
  persist(
    (set, get) => ({
      offerConsumedAt: null as string | null,
      wager: null as PendingWager | null,
      lastResolution: null as WagerResolution | null,

      markOfferConsumed: () => {
        if (get().offerConsumedAt) return;
        set({ offerConsumedAt: new Date().toISOString() });
      },

      placeWager: (): boolean => {
        if (get().wager) return false;
        const coins = queryClient.getQueryData<Economy | null>(economyQueryKey)?.coins ?? 0;
        if (coins < WAGER_STAKE) return false;
        // Escrow now — the stake leaving the wallet is the commitment.
        fireEconomyDelta({ coinsDelta: -WAGER_STAKE });
        set({ wager: { date: todayILISO(), stake: WAGER_STAKE, payout: WAGER_PAYOUT } });
        try { track({ name: 'streak_wager_accepted', props: { stake: WAGER_STAKE, payout: WAGER_PAYOUT } }); } catch { /* non-fatal */ }
        // אודרי #7: tonight's reminder names the PRIZE, never the loss.
        try {
          const ns = useNotificationStore.getState();
          if (ns.permissionGranted) {
            void ns.scheduleStreakReminderWithCopy(
              {
                title: '150 המטבעות של קפטן שארק מחכים',
                body: '2 דקות היום — וה-150 שלך. עסק זה עסק.',
                data: { screen: '/(tabs)/learn' },
              },
              ns.preferredReminderHour ?? 20,
            ).catch(() => { /* non-fatal */ });
          }
        } catch { /* non-fatal */ }
        return true;
      },

      declineWager: () => {
        try { track({ name: 'streak_wager_declined', props: { stake: WAGER_STAKE, payout: WAGER_PAYOUT } }); } catch { /* non-fatal */ }
      },

      resolveWagerIfDue: () => {
        const w = get().wager;
        if (!w) return;
        const today = todayILISO();
        if (today <= w.date) return; // still day 0
        const winDay = nextDayILISO(w.date);
        const activeDates = useEconomyUIStore.getState().activeDates;
        if (activeDates.includes(winDay)) {
          fireEconomyDelta({ coinsDelta: w.payout });
          set({ wager: null, lastResolution: { outcome: 'won', stake: w.stake, payout: w.payout } });
          try { track({ name: 'streak_wager_resolved', props: { outcome: 'won', stake: w.stake, payout: w.payout } }); } catch { /* non-fatal */ }
        } else if (today > winDay) {
          // The win day ended without activity. The escrow stays with the
          // shark — no re-offer, ever (loss-chasing is forbidden).
          set({ wager: null, lastResolution: { outcome: 'lost', stake: w.stake, payout: w.payout } });
          try { track({ name: 'streak_wager_resolved', props: { outcome: 'lost', stake: w.stake, payout: w.payout } }); } catch { /* non-fatal */ }
        }
        // today === winDay with no activity yet → keep waiting.
      },

      clearResolution: () => set({ lastResolution: null }),

      reset: () => set({ offerConsumedAt: null, wager: null, lastResolution: null }),
    }),
    {
      name: 'shark-wager-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (s) => ({
        offerConsumedAt: s.offerConsumedAt,
        wager: s.wager,
        lastResolution: s.lastResolution,
      }),
    },
  ),
);

registerLocalStore('shark-wager-store', useSharkWagerStore, 'shark-wager-store');
