import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';

export type ModifierType = 'real_estate_discount' | 'salary_boost';

export interface ActiveModifier {
  id: string;
  type: ModifierType;
  value: number; // e.g. 0.1 for 10% discount
  expiresAt: string; // ISO string Date
}

interface ModifiersState {
  activeModifiers: ActiveModifier[];
  addModifier: (type: ModifierType, value: number, durationHours: number) => void;
  getActiveModifierValue: (type: ModifierType) => number; // Returns the max value of active modifiers of this type
  clearExpired: () => void;
}

export const useModifiersStore = create<ModifiersState>()(
  persist(
    (set, get) => ({
      activeModifiers: [],
      
      addModifier: (type, value, durationHours) => {
        get().clearExpired();
        const expiresAt = new Date(Date.now() + durationHours * 3600000).toISOString();
        const newMod: ActiveModifier = {
          id: `mod-${Date.now()}`,
          type,
          value,
          expiresAt,
        };
        set((state) => ({
          activeModifiers: [...state.activeModifiers, newMod],
        }));
      },

      getActiveModifierValue: (type) => {
        get().clearExpired();
        const mods = get().activeModifiers.filter((m) => m.type === type);
        if (mods.length === 0) return 0;
        return Math.max(...mods.map((m) => m.value));
      },

      clearExpired: () => {
        const now = new Date().toISOString();
        const { activeModifiers } = get();
        const valid = activeModifiers.filter((m) => m.expiresAt > now);
        if (valid.length !== activeModifiers.length) {
          set({ activeModifiers: valid });
        }
      },
    }),
    {
      name: 'modifiers-store',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
