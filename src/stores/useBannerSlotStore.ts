/**
 * Banner slot — ONE inline banner above the golden node at a time (UX-14,
 * Yoav 18.9.26). Every learn-map banner already self-gates; this only adds a
 * priority contest between the ones that WANT to show, so the active lesson
 * node stays above the fold instead of under a stack of nudges
 * (FRONT-DECLUTTER 11.7: 2,900 banner dismissals vs 3 actions).
 *
 * Usage inside a banner:
 *   const canShow = useBannerSlot('streak_at_risk', wantsToShow, 100);
 *   if (!canShow) return null;
 * The hook registers {id, priority} while `wants` is true and unregisters on
 * unmount / when `wants` flips false. The highest priority wins; ties → the
 * one registered first.
 */
import { useEffect } from 'react';
import { create } from 'zustand';

interface Claim {
  id: string;
  priority: number;
  at: number;
}

interface BannerSlotState {
  claims: Claim[];
  claim: (id: string, priority: number) => void;
  release: (id: string) => void;
}

export const useBannerSlotStore = create<BannerSlotState>()((set, get) => ({
  claims: [],
  claim: (id, priority) => {
    const existing = get().claims.find((c) => c.id === id);
    if (existing && existing.priority === priority) return;
    set({
      claims: [...get().claims.filter((c) => c.id !== id), { id, priority, at: existing?.at ?? Date.now() }],
    });
  },
  release: (id) => {
    if (!get().claims.some((c) => c.id === id)) return;
    set({ claims: get().claims.filter((c) => c.id !== id) });
  },
}));

function winnerId(claims: Claim[]): string | null {
  if (claims.length === 0) return null;
  let best = claims[0];
  for (const c of claims) {
    if (c.priority > best.priority || (c.priority === best.priority && c.at < best.at)) best = c;
  }
  return best.id;
}

/** Banner priorities on the learn map — higher wins. */
export const BANNER_PRIORITY = {
  streakAtRisk: 100,
  firstLesson: 90,
  noFreezeUpsell: 80,
  toolsDiscovery: 70,
  proPromoExpiring: 60,
} as const;

export function useBannerSlot(id: string, wants: boolean, priority: number): boolean {
  const claim = useBannerSlotStore((s) => s.claim);
  const release = useBannerSlotStore((s) => s.release);
  // Single-value selector (Zustand v5 rule) — derive the winner from the
  // claims array reference, which only changes on claim/release.
  const claims = useBannerSlotStore((s) => s.claims);

  useEffect(() => {
    if (wants) claim(id, priority);
    else release(id);
    return () => release(id);
  }, [id, wants, priority, claim, release]);

  return wants && winnerId(claims) === id;
}
