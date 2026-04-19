import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../lib/zustandStorage';

type WalkthroughScreen = 'learn' | 'lesson-preview' | 'feed' | 'chat' | 'shop' | 'bridge' | null;

interface TutorialState {
  hasSeenTradingHubIntro: boolean;
  hasSeenAppWalkthrough: boolean;
  hasChosenChatStyle: boolean;
  hasSeenPizzaIndexModal: boolean;
  hasSeenCh0BullshitInterstitial: boolean;
  hasSeenMod01BarterNotif: boolean;
  hasSeenWatchlistHint: boolean;
  hasSeenAssetUnlockIntro: boolean;
  hasSeenIndicesOnlyNudge: boolean;
  appWalkthroughStep: number;
  walkthroughGlowTab: string | null;
  walkthroughActiveScreen: WalkthroughScreen;
  _hydrated: boolean;
  completeTradingHubIntro: () => void;
  completeAppWalkthrough: () => void;
  completeChatStyleChoice: () => void;
  markPizzaIndexSeen: () => void;
  markCh0BullshitInterstitialSeen: () => void;
  markMod01BarterNotifSeen: () => void;
  markWatchlistHintSeen: () => void;
  markAssetUnlockIntroSeen: () => void;
  markIndicesOnlyNudgeSeen: () => void;
  setAppWalkthroughStep: (step: number) => void;
  setWalkthroughGlowTab: (tab: string | null) => void;
  setWalkthroughActiveScreen: (screen: WalkthroughScreen) => void;
  resetWalkthrough: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenTradingHubIntro: true,
      hasSeenAppWalkthrough: false,
      hasChosenChatStyle: false,
      hasSeenPizzaIndexModal: false,
      hasSeenCh0BullshitInterstitial: false,
      hasSeenMod01BarterNotif: false,
      hasSeenWatchlistHint: false,
      hasSeenAssetUnlockIntro: false,
      hasSeenIndicesOnlyNudge: false,
      appWalkthroughStep: 0,
      walkthroughGlowTab: null,
      walkthroughActiveScreen: null,
      _hydrated: false,
      completeTradingHubIntro: () => set({ hasSeenTradingHubIntro: true }),
      completeAppWalkthrough: () => set({ hasSeenAppWalkthrough: true, appWalkthroughStep: -1, walkthroughGlowTab: null, walkthroughActiveScreen: null }),
      completeChatStyleChoice: () => set({ hasChosenChatStyle: true }),
      markPizzaIndexSeen: () => set({ hasSeenPizzaIndexModal: true }),
      markCh0BullshitInterstitialSeen: () => set({ hasSeenCh0BullshitInterstitial: true }),
      markMod01BarterNotifSeen: () => set({ hasSeenMod01BarterNotif: true }),
      markWatchlistHintSeen: () => set({ hasSeenWatchlistHint: true }),
      markAssetUnlockIntroSeen: () => set({ hasSeenAssetUnlockIntro: true }),
      markIndicesOnlyNudgeSeen: () => set({ hasSeenIndicesOnlyNudge: true }),
      setAppWalkthroughStep: (step: number) => set({ appWalkthroughStep: step }),
      setWalkthroughGlowTab: (tab: string | null) => set({ walkthroughGlowTab: tab }),
      setWalkthroughActiveScreen: (screen: WalkthroughScreen) => set({ walkthroughActiveScreen: screen }),
      resetWalkthrough: () => set({ hasSeenAppWalkthrough: false, appWalkthroughStep: 0, walkthroughGlowTab: null, walkthroughActiveScreen: null }),
    }),
    {
      name: "tutorial-store-v12",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => () => {
        useTutorialStore.setState({ _hydrated: true });
      },
    }
  )
);
