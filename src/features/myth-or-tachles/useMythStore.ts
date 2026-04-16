import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';

const SESSION_LIMIT = 3;
export const MYTH_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

interface MythState {
    seenIds: number[];
    totalCorrect: number;
    totalPlayed: number;
    mythSessionCount: number;
    lastMythSessionTime: number;
    markAnswered: (id: number, wasCorrect: boolean) => void;
    resetSeen: () => void;
    canPlayMyth: (isPro: boolean) => boolean;
    resetMythSessionIfCooldownElapsed: () => void;
}

export const useMythStore = create<MythState>()(
    persist(
        (set, get) => ({
            seenIds: [],
            totalCorrect: 0,
            totalPlayed: 0,
            mythSessionCount: 0,
            lastMythSessionTime: 0,

            markAnswered: (id, wasCorrect) => {
                set((state) => {
                    const elapsed = Date.now() - state.lastMythSessionTime;
                    const sessionReset = state.lastMythSessionTime === 0 || elapsed >= MYTH_COOLDOWN_MS;
                    return {
                        seenIds: state.seenIds.includes(id) ? state.seenIds : [...state.seenIds, id],
                        totalPlayed: state.totalPlayed + 1,
                        totalCorrect: wasCorrect ? state.totalCorrect + 1 : state.totalCorrect,
                        mythSessionCount: sessionReset ? 1 : state.mythSessionCount + 1,
                        lastMythSessionTime: Date.now(),
                    };
                });
            },

            resetSeen: () => {
                set({ seenIds: [] });
            },

            canPlayMyth: (isPro) => {
                if (isPro) return true;
                const { mythSessionCount, lastMythSessionTime } = get();
                if (lastMythSessionTime === 0) return true;
                if (Date.now() - lastMythSessionTime >= MYTH_COOLDOWN_MS) return true;
                return mythSessionCount < SESSION_LIMIT;
            },

            resetMythSessionIfCooldownElapsed: () => {
                const { lastMythSessionTime } = get();
                if (lastMythSessionTime === 0) return;
                if (Date.now() - lastMythSessionTime >= MYTH_COOLDOWN_MS) {
                    set({ mythSessionCount: 0, lastMythSessionTime: 0 });
                }
            },
        }),
        {
            name: 'myth-store-v1',
            storage: createJSONStorage(() => zustandStorage),
            partialize: (state) => ({
                seenIds: state.seenIds,
                totalCorrect: state.totalCorrect,
                totalPlayed: state.totalPlayed,
                mythSessionCount: state.mythSessionCount,
                lastMythSessionTime: state.lastMythSessionTime,
            }),
        },
    ),
);
