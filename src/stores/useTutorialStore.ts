import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from '../lib/zustandStorage';
import type { ToolKey } from '../features/financial-tools/toolsRegistry';
import { registerLocalStore } from '../lib/stores/registry';

// 'tools' replaced 'feed' once the Feed tab was retired (see app/(tabs)/_layout.tsx).
type WalkthroughScreen = 'learn' | 'lesson-preview' | 'tools' | 'chat' | 'shop' | 'bridge' | null;

interface TutorialState {
  hasSeenTradingHubIntro: boolean;
  /** First-ever entry to the Trading Hub: while false, the top mission card +
   *  shark tip are hidden for a clean, less-intimidating first impression
   *  (Yoav 2026-06-19). Set true after the first mount → they appear from the
   *  second visit on. */
  tradingHubFirstEntryDone: boolean;
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
  /** One-shot guard: the free user's single trial of the live Captain Shark
   *  comprehension call (offered on mod-0-2). After this the live call is
   *  Pro-only; the cheap text report stays available weekly. */
  hasUsedFreeSharkCall: boolean;
  /** One-time privacy consent for the live shark voice call — the call streams
   *  mic audio to a third party (ElevenLabs) + the AI, so we disclose and get
   *  explicit approval before the first call. Persisted; shown once. */
  hasAcceptedSharkVoicePrivacy: boolean;
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
  /** Set when the walkthrough completes, for ALL new users. Gates the one-shot
   *  "first chest" onboarding moment (tap-open → coins+XP → shark speech bubble
   *  → המשך) that fires BEFORE the register CTA / Pro teaser. Cleared on המשך,
   *  which then hands off to the existing register→Pro chain. Persisted; one-shot. */
  pendingPostWalkthroughFirstChest: boolean;
  /** One-shot durable flag: the welcome "first chest" (PostWalkthroughFirstChest)
   *  was opened. Set the moment the user taps the welcome chest — BEFORE mod-0-1.
   *  Unlocks the notification-permission ask at the earliest guaranteed win, so
   *  the ~half of new users who drop DURING mod-0-1 still get asked for push (and
   *  thus get the streak comeback reminder). The banner OR's this with the
   *  mod-0-1-completion gate, so existing users who predate the welcome chest
   *  still qualify via completion. Yoav 2026-06-26 (D1 lever). */
  firstChestOpened: boolean;
  /** mod-0-1's inline knowledgeLevel question was resolved (answered OR
   *  skipped). Gates the mod-0-1 70% chest so it appears AFTER the onboarding
   *  question, never before/over it (Yoav 2026-06-17). Skip-safe: set on either
   *  outcome, so the chest is never blocked. */
  mod01KnowledgeResolved: boolean;
  /** One-shot: the energy-intro popup was shown at mod-0-1b's first chip. Energy
   *  is OFF in mod-0-1, so mod-0-1b is the user's first encounter with it, and we
   *  explain it once there (Yoav 2026-06-25). */
  hasSeenEnergyIntro: boolean;
  /** App-store rating prompt state (Yoav 2026-06-21). `ratePromptHandled` =
   *  user rated OR opted out permanently. `lastRatePromptAt` drives the
   *  cooldown; `ratePromptCount` caps total asks. Gating: see rateAppPrompt.ts. */
  ratePromptHandled: boolean;
  lastRatePromptAt: number | null;
  ratePromptCount: number;
  /** One-shot: the prominent Captain-Shark notification-permission MODAL was
   *  shown (allow OR "later"). Gates it to exactly once; the recurring thin
   *  NotificationPermissionBanner only takes over AFTER this is true. Yoav
   *  2026-06-21 ("make sure users get a one-time prompt to allow notifications").*/
  notifPromptShown: boolean;
  _hydrated: boolean;
  completeTradingHubIntro: () => void;
  markTradingHubFirstEntryDone: () => void;
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
  setPendingPostWalkthroughFirstChest: (value: boolean) => void;
  markFirstChestOpened: () => void;
  markMod01KnowledgeResolved: () => void;
  markEnergyIntroSeen: () => void;
  /** Called when the rating modal actually opens — bumps count + stamps time. */
  markRatePromptShown: () => void;
  /** User tapped "rate" (or opted out) — never ask again. */
  markRated: () => void;
  /** Called when the one-time notification-permission modal is shown (either CTA). */
  markNotifPromptShown: () => void;
  markFreeSharkCallUsed: () => void;
  markSharkVoicePrivacyAccepted: () => void;
  resetWalkthrough: () => void;
  reset: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenTradingHubIntro: true,
      tradingHubFirstEntryDone: false,
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
      hasUsedFreeSharkCall: false,
      hasAcceptedSharkVoicePrivacy: false,
      hasSeenPearlTooltip: false,
      appWalkthroughStep: 0,
      walkthroughGlowTab: null,
      walkthroughActiveScreen: null,
      pendingPostWalkthroughCTA: false,
      pendingPostWalkthroughProTeaser: false,
      pendingPostWalkthroughFirstChest: false,
      firstChestOpened: false,
      mod01KnowledgeResolved: false,
      hasSeenEnergyIntro: false,
      ratePromptHandled: false,
      lastRatePromptAt: null,
      ratePromptCount: 0,
      notifPromptShown: false,
      _hydrated: false,
      completeTradingHubIntro: () => set({ hasSeenTradingHubIntro: true }),
      markTradingHubFirstEntryDone: () => set({ tradingHubFirstEntryDone: true }),
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
      markFreeSharkCallUsed: () => set({ hasUsedFreeSharkCall: true }),
      markSharkVoicePrivacyAccepted: () => set({ hasAcceptedSharkVoicePrivacy: true }),
      markPearlTooltipSeen: () => set({ hasSeenPearlTooltip: true }),
      setAppWalkthroughStep: (step: number) => set({ appWalkthroughStep: step }),
      setWalkthroughGlowTab: (tab: string | null) => set({ walkthroughGlowTab: tab }),
      setWalkthroughActiveScreen: (screen: WalkthroughScreen) => set({ walkthroughActiveScreen: screen }),
      setPendingPostWalkthroughCTA: (value: boolean) => set({ pendingPostWalkthroughCTA: value }),
      setPendingPostWalkthroughProTeaser: (value: boolean) => set({ pendingPostWalkthroughProTeaser: value }),
      setPendingPostWalkthroughFirstChest: (value: boolean) => set({ pendingPostWalkthroughFirstChest: value }),
      markFirstChestOpened: () => set({ firstChestOpened: true }),
      markMod01KnowledgeResolved: () => set({ mod01KnowledgeResolved: true }),
      markEnergyIntroSeen: () => set({ hasSeenEnergyIntro: true }),
      markRatePromptShown: () => set((s) => ({ ratePromptCount: s.ratePromptCount + 1, lastRatePromptAt: Date.now() })),
      markRated: () => set({ ratePromptHandled: true }),
      markNotifPromptShown: () => set({ notifPromptShown: true }),
      resetWalkthrough: () => set({ hasSeenAppWalkthrough: false, appWalkthroughStep: 0, walkthroughGlowTab: null, walkthroughActiveScreen: null, walkthroughTriggered: true, pendingPostWalkthroughCTA: false, pendingPostWalkthroughProTeaser: false, pendingPostWalkthroughFirstChest: false }),
      reset: () => set({ hasSeenTradingHubIntro: true, tradingHubFirstEntryDone: false, hasSeenAppWalkthrough: false, walkthroughTriggered: false, hasChosenChatStyle: false, hasSeenPizzaIndexModal: false, hasSeenCh0BullshitInterstitial: false, hasSeenMod01BarterNotif: false, hasSeenWatchlistHint: false, hasSeenAssetUnlockIntro: false, hasSeenIndicesOnlyNudge: false, hasSeenToolTutorial: {}, moduleEndGateShown: {}, hasSeenMod05BridgeCTA: false, hasUsedFreeSharkCall: false, hasAcceptedSharkVoicePrivacy: false, hasSeenPearlTooltip: false, ratePromptHandled: false, lastRatePromptAt: null, ratePromptCount: 0, notifPromptShown: false, appWalkthroughStep: 0, walkthroughGlowTab: null, walkthroughActiveScreen: null, pendingPostWalkthroughCTA: false, pendingPostWalkthroughProTeaser: false, pendingPostWalkthroughFirstChest: false, _hydrated: false }),
    }),
    {
      name: "tutorial-store-v13",
      storage: createJSONStorage(() => zustandStorage),
      onRehydrateStorage: () => () => {
        useTutorialStore.setState({ _hydrated: true });
      },
    }
  )
);

registerLocalStore('tutorial-store-v13', useTutorialStore, 'tutorial-store-v13');
