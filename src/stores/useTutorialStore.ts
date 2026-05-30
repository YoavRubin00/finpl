import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../lib/zustandStorage';
import type { ToolKey } from '../features/financial-tools/toolsRegistry';
import { registerLocalStore } from '../lib/stores/registry';

// 'tools' replaced 'feed' once the Feed tab was retired (see app/(tabs)/_layout.tsx).
type WalkthroughScreen = 'learn' | 'lesson-preview' | 'tools' | 'chat' | 'shop' | 'bridge' | null;

interface TutorialState {
  hasSeenTradingHubIntro: boolean;
  hasSeenAppWalkthrough: boolean;
  /** Set when the user explicitly opts into the walkthrough (e.g. taps
   *  "המשך" on the mod-0-1 completion modal). The overlay only renders
   *  step 0 once this is true — prevents the auto-timer race where the
   *  walkthrough opens before the user has acknowledged the prompt. */
  walkthroughTriggered: boolean;
  hasChosenChatStyle: boolean;
  hasSeenPizzaIndexModal: boolean;
  hasSeenCh0BullshitInterstitial: boolean;
  hasSeenMod01BarterNotif: boolean;
  hasSeenWatchlistHint: boolean;
  hasSeenAssetUnlockIntro: boolean;
  hasSeenIndicesOnlyNudge: boolean;
  /** Per-tool first-visit guard for the in-tool Captain Shark tutorial overlay. */
  hasSeenToolTutorial: Partial<Record<ToolKey, boolean>>;
  appWalkthroughStep: number;
  walkthroughGlowTab: string | null;
  walkthroughActiveScreen: WalkthroughScreen;
  /** Set when the walkthrough completes for a Guest user. The gate in
   *  app/_layout.tsx renders the post-walkthrough register-CTA modal as
   *  soon as the user lands on /(tabs) and clears the flag on dismiss /
   *  accept. Persisted so that closing the app between the walkthrough
   *  end and the Pricing screen does not lose the CTA. */
  pendingPostWalkthroughCTA: boolean;
  _hydrated: boolean;
  completeTradingHubIntro: () => void;
  completeAppWalkthrough: () => void;
  triggerWalkthrough: () => void;
  completeChatStyleChoice: () => void;
  markPizzaIndexSeen: () => void;
  markCh0BullshitInterstitialSeen: () => void;
  markMod01BarterNotifSeen: () => void;
  markWatchlistHintSeen: () => void;
  markAssetUnlockIntroSeen: () => void;
  markIndicesOnlyNudgeSeen: () => void;
  markToolTutorialSeen: (toolKey: ToolKey) => void;
  setAppWalkthroughStep: (step: number) => void;
  setWalkthroughGlowTab: (tab: string | null) => void;
  setWalkthroughActiveScreen: (screen: WalkthroughScreen) => void;
  setPendingPostWalkthroughCTA: (value: boolean) => void;
  resetWalkthrough: () => void;
  reset: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenTradingHubIntro: true,
      hasSeenAppWalkthrough: false,
      walkthroughTriggered: false,
      hasChosenChatStyle: false,
      hasSeenPizzaIndexModal: false,
      hasSeenCh0BullshitInterstitial: false,
      hasSeenMod01BarterNotif: false,
      hasSeenWatchlistHint: false,
      hasSeenAssetUnlockIntro: false,
      hasSeenIndicesOnlyNudge: false,
      hasSeenToolTutorial: {},
      appWalkthroughStep: 0,
      walkthroughGlowTab: null,
      walkthroughActiveScreen: null,
      pendingPostWalkthroughCTA: false,
      _hydrated: false,
      completeTradingHubIntro: () => set({ hasSeenTradingHubIntro: true }),
      completeAppWalkthrough: () => set({ hasSeenAppWalkthrough: true, appWalkthroughStep: -1, walkthroughGlowTab: null, walkthroughActiveScreen: null, walkthroughTriggered: false }),
      triggerWalkthrough: () => set({ walkthroughTriggered: true }),
      completeChatStyleChoice: () => set({ hasChosenChatStyle: true }),
      markPizzaIndexSeen: () => set({ hasSeenPizzaIndexModal: true }),
      markCh0BullshitInterstitialSeen: () => set({ hasSeenCh0BullshitInterstitial: true }),
      markMod01BarterNotifSeen: () => set({ hasSeenMod01BarterNotif: true }),
      markWatchlistHintSeen: () => set({ hasSeenWatchlistHint: true }),
      markAssetUnlockIntroSeen: () => set({ hasSeenAssetUnlockIntro: true }),
      markIndicesOnlyNudgeSeen: () => set({ hasSeenIndicesOnlyNudge: true }),
      markToolTutorialSeen: (toolKey: ToolKey) => set((s) => ({ hasSeenToolTutorial: { ...s.hasSeenToolTutorial, [toolKey]: true } })),
      setAppWalkthroughStep: (step: number) => set({ appWalkthroughStep: step }),
      setWalkthroughGlowTab: (tab: string | null) => set({ walkthroughGlowTab: tab }),
      setWalkthroughActiveScreen: (screen: WalkthroughScreen) => set({ walkthroughActiveScreen: screen }),
      setPendingPostWalkthroughCTA: (value: boolean) => set({ pendingPostWalkthroughCTA: value }),
      resetWalkthrough: () => set({ hasSeenAppWalkthrough: false, appWalkthroughStep: 0, walkthroughGlowTab: null, walkthroughActiveScreen: null, walkthroughTriggered: true, pendingPostWalkthroughCTA: false }),
      reset: () => set({ hasSeenTradingHubIntro: true, hasSeenAppWalkthrough: false, walkthroughTriggered: false, hasChosenChatStyle: false, hasSeenPizzaIndexModal: false, hasSeenCh0BullshitInterstitial: false, hasSeenMod01BarterNotif: false, hasSeenWatchlistHint: false, hasSeenAssetUnlockIntro: false, hasSeenIndicesOnlyNudge: false, hasSeenToolTutorial: {}, appWalkthroughStep: 0, walkthroughGlowTab: null, walkthroughActiveScreen: null, pendingPostWalkthroughCTA: false, _hydrated: false }),
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

registerLocalStore('tutorial-store-v12', useTutorialStore, 'tutorial-store-v12');
