import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';

/**
 * R8 T3.5 — Captain Shark cosmetics (Streak Wager).
 *
 * Duolingo's Owl skin system uses sunk-cost identity to lift D30. The
 * FinPlay version deliberately drops the punitive half: the user
 * unlocks Gold + Fire skins at 7-day streak and can select one to
 * personalize the Captain. If the streak breaks, the selected skin
 * reverts to `classic` automatically — but the entitlement stays in
 * `unlocked`, so re-selecting it costs nothing.
 *
 * Audrey pre-release audit (2026-06-11): the previous version stripped
 * the skin from `unlocked` on break + offered a 100-coin rebuy. That's
 * a textbook sunk-cost dark pattern (manufacture loss → sell the fix).
 * Removed. The streak-wager identity hook is preserved via the visual
 * revert + the picker copy ("ללא תנאי"), not via punishment.
 */

/** Skin identifier — the visual asset key + persisted store value. */
export type SharkSkinId = 'classic' | 'gold' | 'fire';

export interface SharkSkin {
  id: SharkSkinId;
  label: string;
  /** Hebrew descriptor surfaced in the picker. */
  description: string;
  /** Hex color used for the picker tile + halo accent. */
  accent: string;
  /** True when this skin requires the user to cross the 7-day streak
   *  threshold before they can equip it. Classic is always available. */
  unlockOnStreak7: boolean;
}

export const SHARK_SKINS: SharkSkin[] = [
  {
    id: 'classic',
    label: 'קלאסיק',
    description: 'הקפטן המקורי',
    accent: '#0e7490',
    unlockOnStreak7: false,
  },
  {
    id: 'gold',
    label: 'זהב',
    description: 'נפתח עם 7 ימים ברצף',
    accent: '#facc15',
    unlockOnStreak7: true,
  },
  {
    id: 'fire',
    label: 'אש',
    description: 'נפתח עם 7 ימים ברצף',
    accent: '#f97316',
    unlockOnStreak7: true,
  },
];

/** Deprecated — kept exported as 0 so any stale import compiles + charges
 *  nothing while the rebuy UI is removed. Inline removal of all imports
 *  follows separately. */
export const SKIN_REBUY_COST = 0;

interface CosmeticsState {
  /** Skins the user has the right to equip. `classic` is always
   *  present and cannot be removed. */
  unlocked: SharkSkinId[];
  /** Currently equipped skin — drives the Captain Shark image
   *  rendered across the app. */
  selected: SharkSkinId;
  /** True once the user has crossed the 7-day streak threshold AT
   *  LEAST ONCE in their lifetime. Used to suppress the picker
   *  modal from re-appearing if they've already gone through the
   *  unlock ceremony and chose Classic. */
  hasSeen7DayPicker: boolean;
  /** True when the streak watcher detects a break AND the user had
   *  a non-classic skin equipped — drives the "skin lost" reveal
   *  modal. Cleared by `acknowledgeSkinLost()`. */
  pendingSkinLost: SharkSkinId | null;

  /** R8 T3.5 — fired by the streak watcher when current streak crosses
   *  7. Unlocks gold + fire and queues the picker. Idempotent. */
  unlockSevenDayRewards: () => void;
  /** User chose a skin in the picker. Sets it as `selected` and
   *  flips `hasSeen7DayPicker` so the modal doesn't re-fire. */
  selectSkin: (skin: SharkSkinId) => void;
  /** Streak watcher fires this when streak breaks AND a non-classic
   *  skin was equipped. Reverts the *selected* skin to classic and
   *  surfaces the empathic notice — but the lost skin STAYS in
   *  `unlocked` so re-selecting it is free. */
  revertToClassic: () => void;
  /** User dismissed the skin-revert notice — clears the pending flag. */
  acknowledgeSkinLost: () => void;
  /** User re-selected a previously-equipped skin from the notice.
   *  Identical to selectSkin — kept for callsite clarity. */
  rebuySkin: (skin: SharkSkinId) => void;
  reset: () => void;
}

export const useCosmeticsStore = create<CosmeticsState>()(
  persist(
    (set, get) => ({
      unlocked: ['classic'],
      selected: 'classic',
      hasSeen7DayPicker: false,
      pendingSkinLost: null,

      unlockSevenDayRewards: () => {
        const state = get();
        if (state.hasSeen7DayPicker) return;
        const next = new Set(state.unlocked);
        next.add('gold');
        next.add('fire');
        set({ unlocked: Array.from(next) });
      },

      selectSkin: (skin) => {
        const state = get();
        if (!state.unlocked.includes(skin)) return;
        set({ selected: skin, hasSeen7DayPicker: true });
      },

      revertToClassic: () => {
        const state = get();
        // Classic break = nothing visible to revert.
        if (state.selected === 'classic') return;
        const lost = state.selected;
        // Audrey 2026-06-11: keep `unlocked` intact. The streak break
        // changes the *equipped* look only; the entitlement is the
        // user's forever. No coin charge to re-select later.
        set({
          selected: 'classic',
          pendingSkinLost: lost,
        });
      },

      acknowledgeSkinLost: () => set({ pendingSkinLost: null }),

      rebuySkin: (skin) => {
        const state = get();
        // After Audrey 2026-06-11: re-selecting a previously-unlocked
        // skin is free. We only ensure unlock — defensive for cohorts
        // whose persisted state pre-dated the dark-pattern removal and
        // got their skin stripped from `unlocked`.
        const next = new Set(state.unlocked);
        next.add(skin);
        set({ unlocked: Array.from(next), selected: skin, pendingSkinLost: null });
      },

      reset: () =>
        set({
          unlocked: ['classic'],
          selected: 'classic',
          hasSeen7DayPicker: false,
          pendingSkinLost: null,
        }),
    }),
    {
      name: 'cosmetics-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        unlocked: state.unlocked,
        selected: state.selected,
        hasSeen7DayPicker: state.hasSeen7DayPicker,
        pendingSkinLost: state.pendingSkinLost,
      }),
    },
  ),
);

registerLocalStore('cosmetics-store', useCosmeticsStore, 'cosmetics-store');
