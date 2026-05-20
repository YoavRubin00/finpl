/**
 * Global cooldown for top NotificationBanner stack. Prevents two banners
 * from being on screen at once (they all share position:absolute, top:0,
 * zIndex:999 and visually overlap). Each consumer hook checks
 * `canShowNow()` before setting itself visible, and calls `markShown()`
 * the moment it does — so the next banner waits at least 10s.
 */
import { create } from 'zustand';

const COOLDOWN_MS = 10_000;

interface BannerCooldownState {
  lastShownAt: number;
  markShown: () => void;
  msUntilNextSlot: () => number;
  canShowNow: () => boolean;
}

export const useBannerCooldownStore = create<BannerCooldownState>((set, get) => ({
  lastShownAt: 0,
  markShown: () => set({ lastShownAt: Date.now() }),
  msUntilNextSlot: () =>
    Math.max(0, COOLDOWN_MS - (Date.now() - get().lastShownAt)),
  canShowNow: () => Date.now() - get().lastShownAt >= COOLDOWN_MS,
}));
