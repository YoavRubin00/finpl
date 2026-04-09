import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { wisdomQuotes } from './wisdomData';
import { psychWisdomFlashes } from './psychWisdomData';
import type { WisdomItem } from './types';

/* ------------------------------------------------------------------ */
/*  Combined pool of all wisdom items                                  */
/* ------------------------------------------------------------------ */

const ALL_WISDOM: WisdomItem[] = [...wisdomQuotes, ...psychWisdomFlashes];

/* ------------------------------------------------------------------ */
/*  Store interface                                                    */
/* ------------------------------------------------------------------ */

interface WisdomState {
    /** IDs of items the user has already seen */
    seenIds: string[];
    /** Favorite item IDs (PRD13) */
    favorites: string[];
    /** Currently active item to display (null = none) */
    activeItem: WisdomItem | null;

    /** Pick a random unseen item and set it as active */
    showRandomWisdom: () => void;
    /** Dismiss the current popup */
    dismiss: () => void;
    /** Toggle favorite status */
    toggleFavorite: (id: string) => void;
    /** Check if an item is favorited */
    isFavorite: (id: string) => boolean;
    /** Get all favorite items */
    getFavoriteItems: () => WisdomItem[];
}

export const useWisdomStore = create<WisdomState>()(
    persist(
        (set, get) => ({
            seenIds: [],
            favorites: [],
            activeItem: null,

            showRandomWisdom: () => {
                const { seenIds } = get();
                // Filter unseen items
                let pool = ALL_WISDOM.filter((item) => !seenIds.includes(item.id));
                // If all seen, reset cycle
                if (pool.length === 0) {
                    pool = ALL_WISDOM;
                    set({ seenIds: [] });
                }
                // Pick random
                const item = pool[Math.floor(Math.random() * pool.length)];
                set((state) => ({
                    activeItem: item,
                    seenIds: [...state.seenIds, item.id],
                }));
            },

            dismiss: () => {
                set({ activeItem: null });
            },

            toggleFavorite: (id: string) => {
                set((state) => ({
                    favorites: state.favorites.includes(id)
                        ? state.favorites.filter((fav) => fav !== id)
                        : [...state.favorites, id],
                }));
            },

            isFavorite: (id: string) => {
                return get().favorites.includes(id);
            },

            getFavoriteItems: () => {
                const { favorites } = get();
                return ALL_WISDOM.filter((item) => favorites.includes(item.id));
            },
        }),
        {
            name: 'wisdom-store',
            version: 1,
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                seenIds: state.seenIds,
                favorites: state.favorites,
            }),
        },
    ),
);
