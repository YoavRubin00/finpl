import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { registerLocalStore } from '../../lib/stores/registry';

/**
 * R8 T3.5 — Captain Shark cosmetics (Streak Wager).
 *
 * Duolingo's Owl skin system lifts D30 retention +18-22% via sunk-cost
 * identity ("I can't break a streak — I paid for this skin"). This
 * store is the FinPlay equivalent: the user unlocks Gold + Fire skins
 * at 7-day streak; selecting one stakes their identity on that streak.
 *
 * If the streak breaks, `revertToClassic()` is fired by the streak
 * watcher and the selected skin reverts to `classic`. The user can
 * buy the skin back at {@link SKIN_REBUY_COST} coins so a single bad
 * day doesn't punish them permanently — Yoav's "forgiving fallback"
 * guardrail.
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

/** Cost to re-equip a skin that was lost when the streak broke. */
export const SKIN_REBUY_COST = 100;

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
   *  skin was equipped. Reverts to classic, removes the lost skin
   *  from `unlocked`, and queues the "skin lost" reveal modal. */
  revertToClassic: () => void;
  /** User dismissed the skin-lost reveal — clears the pending flag. */
  acknowledgeSkinLost: () => void;
  /** User chose to re-buy the lost skin (charged elsewhere). Returns
   *  the skin to `unlocked` and re-equips it. */
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
        // Classic break = nothing visible to lose.
        if (state.selected === 'classic') return;
        const lost = state.selected;
        const filtered = state.unlocked.filter((s) => s !== lost);
        set({
          selected: 'classic',
          unlocked: filtered.length > 0 ? filtered : ['classic'],
          pendingSkinLost: lost,
        });
      },

      acknowledgeSkinLost: () => set({ pendingSkinLost: null }),

      rebuySkin: (skin) => {
        const state = get();
        const next = new Set(state.unlocked);
        next.add(skin);
        set({ unlocked: Array.from(next), selected: skin });
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
