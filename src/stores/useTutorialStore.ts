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
  /** Per-module guard for the end-of-module signup gate (guests, mod-0-2+).
   *  Shown once per module after the chest sequence. Yoav 2026-06-15. */
  moduleEndGateShown: Record<string, boolean>;
  /** One-shot guard for the special mod-0-5 ("אז למה להשקיע?") completion CTA
   *  that hands the user off to the Bridge with Altshuler highlighted. The
   *  Altshuler conversion of 2026-05-30 took 38 hours because the user had
   *  to re-discover the Bridge on their own — this CTA closes that loop on
   *  first completion. Per דואו's one-shot rule, never show twice. */
  hasSeenMod05BridgeCTA: boolean;
  /** One-shot guard for the in-pearl-topper "פנינה = תוכן בונוס, אפשר לדלג
   *  ולחזור מתי שבא לך" tooltip. Shows the first time the user enters a
   *  pearl in their lifetime, marks itself seen on tap-"הבנתי", and never
   *  reappears. Anchors users' mental model around pearls = optional bonus,
   *  not required path content. Per user decision 2026-06-02 + exp-002. */
  hasSeenPearlTooltip: boolean;
  appWalkthroughStep: number;
  walkthroughGlowTab: string | null;
  walkthroughActiveScreen: WalkthroughScreen;
  /** Set when the walkthrough completes for a Guest user. The gate in
   *  app/_layout.tsx renders the post-walkthrough register-CTA modal as
   *  soon as the user lands on /(tabs) and clears the flag on dismiss /
   *  accept. Persisted so that closing the app between the walkthrough
   *  end and the Pricing screen does not lose the CTA. */
  pendingPostWalkthroughCTA: boolean;
  /** Set when the walkthrough completes for a NON-Pro user (and, for guests,
   *  after the register CTA resolves). The gate in app/_layout.tsx renders a
   *  soft, dismissible 7-day-trial Pro teaser — restores the post_walkthrough
   *  monetization moment (volume) without blocking the path to the first
   *  module. One-shot: cleared on either CTA. */
  pendingPostWalkthroughProTeaser: boolean;
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
  markModuleEndGateShown: (moduleId: string) => void;
  markMod05BridgeCTASeen: () => void;
  markPearlTooltipSeen: () => void;
  setAppWalkthroughStep: (step: number) => void;
  setWalkthroughGlowTab: (tab: string | null) => void;
  setWalkthroughActiveScreen: (screen: WalkthroughScreen) => void;
  setPendingPostWalkthroughCTA: (value: boolean) => void;
  setPendingPostWalkthroughProTeaser: (value: boolean) => void;
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
      moduleEndGateShown: {},
      hasSeenMod05BridgeCTA: false,
      hasSeenPearlTooltip: false,
      appWalkthroughStep: 0,
      walkthroughGlowTab: null,
      walkthroughActiveScreen: null,
      pendingPostWalkthroughCTA: false,
      pendingPostWalkthroughProTeaser: false,
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
      markModuleEndGateShown: (moduleId: string) => set((s) => ({ moduleEndGateShown: { ...s.moduleEndGateShown, [moduleId]: true } })),
      markMod05BridgeCTASeen: () => set({ hasSeenMod05BridgeCTA: true }),
      markPearlTooltipSeen: () => set({ hasSeenPearlTooltip: true }),
      setAppWalkthroughStep: (step: number) => set({ appWalkthroughStep: step }),
      setWalkthroughGlowTab: (tab: string | null) => set({ walkthroughGlowTab: tab }),
      setWalkthroughActiveScreen: (screen: WalkthroughScreen) => set({ walkthroughActiveScreen: screen }),
      setPendingPostWalkthroughCTA: (value: boolean) => set({ pendingPostWalkthroughCTA: value }),
      setPendingPostWalkthroughProTeaser: (value: boolean) => set({ pendingPostWalkthroughProTeaser: value }),
      resetWalkthrough: () => set({ hasSeenAppWalkthrough: false, appWalkthroughStep: 0, walkthroughGlowTab: null, walkthroughActiveScreen: null, walkthroughTriggered: true, pendingPostWalkthroughCTA: false, pendingPostWalkthroughProTeaser: false }),
      reset: () => set({ hasSeenTradingHubIntro: true, hasSeenAppWalkthrough: false, walkthroughTriggered: false, hasChosenChatStyle: false, hasSeenPizzaIndexModal: false, hasSeenCh0BullshitInterstitial: false, hasSeenMod01BarterNotif: false, hasSeenWatchlistHint: false, hasSeenAssetUnlockIntro: false, hasSeenIndicesOnlyNudge: false, hasSeenToolTutorial: {}, moduleEndGateShown: {}, hasSeenMod05BridgeCTA: false, hasSeenPearlTooltip: false, appWalkthroughStep: 0, walkthroughGlowTab: null, walkthroughActiveScreen: null, pendingPostWalkthroughCTA: false, pendingPostWalkthroughProTeaser: false, _hydrated: false }),
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
