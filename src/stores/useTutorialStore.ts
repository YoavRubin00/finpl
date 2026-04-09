import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TutorialState {
  hasSeenTradingHubIntro: boolean;
  hasSeenAppWalkthrough: boolean;
  hasChosenChatStyle: boolean;
  appWalkthroughStep: number;
  walkthroughGlowTab: string | null;
  _hydrated: boolean;
  completeTradingHubIntro: () => void;
  completeAppWalkthrough: () => void;
  completeChatStyleChoice: () => void;
  setAppWalkthroughStep: (step: number) => void;
  setWalkthroughGlowTab: (tab: string | null) => void;
  resetWalkthrough: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenTradingHubIntro: true,
      hasSeenAppWalkthrough: false,
      hasChosenChatStyle: false,
      appWalkthroughStep: 0,
      walkthroughGlowTab: null,
      _hydrated: false,
      completeTradingHubIntro: () => set({ hasSeenTradingHubIntro: true }),
      completeAppWalkthrough: () => set({ hasSeenAppWalkthrough: true, appWalkthroughStep: -1, walkthroughGlowTab: null }),
      completeChatStyleChoice: () => set({ hasChosenChatStyle: true }),
      setAppWalkthroughStep: (step: number) => set({ appWalkthroughStep: step }),
      setWalkthroughGlowTab: (tab: string | null) => set({ walkthroughGlowTab: tab }),
      resetWalkthrough: () => set({ hasSeenAppWalkthrough: false, appWalkthroughStep: 0, walkthroughGlowTab: null }),
    }),
    {
      name: "tutorial-store-v8",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useTutorialStore.setState({ _hydrated: true });
      },
    }
  )
);
