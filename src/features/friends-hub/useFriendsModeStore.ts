import { create } from "zustand";

/**
 * "Friends Mode" — sticky context that swaps the bottom tab bar from the
 * global app tabs (Investments / Feed / Learn / Friends / Chat) to a
 * Friends-specific set (Home / Knowledge / Fantasy / Clan).
 *
 * Lifecycle:
 *   • Enter via FriendsHubScreen.useEffect on mount.
 *   • Stays enabled while the user navigates to /clan, /fantasy, /anon-advice,
 *     /crowd-wisdom — these screens render the FriendsModeOverlay sticky bar.
 *   • Exits when the user taps the "Home" tab inside Friends Mode (which also
 *     navigates back to /(tabs)/index), or when AnimatedTabBar detects a
 *     focus on a non-Friends tab (investments/learn/chat).
 *
 * Intentionally NOT persisted — Friends Mode is a session-only UI state.
 */
interface FriendsModeState {
  enabled: boolean;
  enter: () => void;
  exit: () => void;
}

export const useFriendsModeStore = create<FriendsModeState>((set) => ({
  enabled: false,
  enter: () => set({ enabled: true }),
  exit: () => set({ enabled: false }),
}));