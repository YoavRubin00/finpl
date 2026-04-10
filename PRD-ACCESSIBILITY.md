# PRD: Israeli Accessibility Standard Compliance (תקנה 5568 / WCAG 2.1 AA)

## Goal
Make FinPlay fully accessible per Israeli Standard 5568 (based on WCAG 2.1 AA), required for all public-facing apps in Israel.

## Scope
All 201 .tsx files in `src/` — every interactive element must be screen-reader friendly.

---

## Requirements

### R1: accessibilityLabel on ALL interactive elements
Every `<Pressable>`, `<TouchableOpacity>`, `<AnimatedPressable>` must have `accessibilityLabel` in Hebrew.
- Buttons with visible text: use the text as label
- Icon-only buttons: descriptive label (e.g., "סגור", "חזרה", "הצג סיסמה")
- Toggle buttons: dynamic label reflecting state

### R2: accessibilityRole on ALL interactive elements
- Buttons → `accessibilityRole="button"`
- Links/navigation → `accessibilityRole="link"`
- Checkboxes → `accessibilityRole="checkbox"` + `accessibilityState={{ checked }}`
- Headers → `accessibilityRole="header"`
- Images → `accessibilityRole="image"` + label, OR `accessible={false}` for decorative
- Text inputs → `accessibilityLabel` (not just placeholder)
- Tabs → `accessibilityRole="tab"` (already done in AnimatedTabBar)
- Sliders → `accessibilityRole="adjustable"`

### R3: Decorative images must be hidden from screen readers
All Finn mascot images, background lotties, decorative icons:
```tsx
<Image source={FINN_STANDARD} accessible={false} />
<LottieView source={...} accessible={false} />
```

### R4: accessibilityLabel on TextInput
Every `<TextInput>` must have `accessibilityLabel` in Hebrew — placeholder is NOT sufficient.

### R5: Minimum touch target 44x44
All pressable elements must have at minimum 44x44 logical pixels.
Use `hitSlop` for small buttons: `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}`

### R6: Color contrast
- Normal text (< 18pt): contrast ratio ≥ 4.5:1
- Large text (≥ 18pt bold / ≥ 24pt): contrast ratio ≥ 3:1
- Key areas to check: muted text (#94a3b8 on white), gradient text, disabled states

### R7: Reduced motion support
Wrap heavy animations with `useReducedMotion()` from react-native-reanimated:
```tsx
import { useReducedMotion } from 'react-native-reanimated';
const reduceMotion = useReducedMotion();
// Skip or simplify animations when reduceMotion is true
```

---

## Files to modify (by priority)

### Tier 1 — Auth & Onboarding (every user sees these)
- `src/features/auth/LoginScreen.tsx` ✅ DONE
- `src/features/auth/RegisterScreen.tsx` ✅ PARTIAL
- `src/features/auth/ForgotPasswordScreen.tsx`
- `src/features/auth/GuestProgressGate.tsx`
- `src/features/onboarding/ProfilingFlow.tsx`
- `src/features/onboarding/AppWalkthroughOverlay.tsx`

### Tier 2 — Shared UI components (affect entire app)
- `src/components/ui/SupercellButton.tsx` ✅ DONE
- `src/components/ui/GlowCard.tsx` ✅ DONE
- `src/components/ui/AnimatedPressable.tsx` ✅ (already has accessibilityRole="button")
- `src/components/ui/BackButton.tsx`
- `src/components/ui/DoubleOrNothingModal.tsx`
- `src/components/ui/SimFeedbackBar.tsx`
- `src/components/ui/GlobalWealthHeader.tsx`
- `src/components/ui/FeedNudgeBanner.tsx`
- `src/components/ui/NotificationPermissionBanner.tsx`
- `src/components/ui/LevelUpBanner.tsx`
- `src/components/ui/TransitionOverlay.tsx`
- `src/components/ui/GlossaryTooltip.tsx`

### Tier 3 — Main app screens
- `src/features/chapter-1-content/LessonFlowScreen.tsx`
- `src/features/pyramid/DuoLearnScreen.tsx`
- `src/features/finfeed/FinFeedScreen.tsx`
- `src/features/finfeed/FeedQuoteItem.tsx`
- `src/features/finfeed/FeedScenarioCard.tsx`
- `src/features/daily-challenges/SwipeGameCard.tsx`
- `src/features/daily-challenges/CrashGameCard.tsx`
- `src/features/daily-challenges/DilemmaCard.tsx`
- `src/features/daily-challenges/InvestmentCard.tsx`
- `src/features/myth-or-tachles/MythCardDeck.tsx`
- `src/features/daily-quiz/DailyQuizSheet.tsx`
- `src/features/chat/ChatScreen.tsx`
- `src/features/shop/ShopScreen.tsx`
- `src/features/shop/ShopModal.tsx`
- `src/features/subscription/PricingScreen.tsx`
- `src/features/subscription/UpgradeModal.tsx`
- `src/features/profile/ProfileScreen.tsx`
- `src/features/settings/SettingsScreen.tsx`
- `src/features/more/MoreScreen.tsx`
- `src/features/assets/AssetsScreen.tsx`

### Tier 4 — Simulation screens (~40 files)
All screens in `src/features/chapter-*/simulations/*.tsx`
Pattern: ScoreScreen buttons (replay/continue), option buttons, game controls.

### Tier 5 — Feed & social
- `src/features/finfeed/FeedVideoItem.tsx`
- `src/features/finfeed/FeedPremiumLearningCard.tsx`
- `src/features/finfeed/FeedModuleHookCard.tsx`
- `src/features/social/ReferralScreen.tsx`
- `src/features/friends-clash/ClashGameScreen.tsx`
- `src/features/scenario-lab/SuggestScenarioScreen.tsx`

---

## Verification
1. `npx tsc --noEmit` — zero errors
2. Enable TalkBack (Android) or VoiceOver (iOS) and navigate through every screen
3. Every button announced with Hebrew label
4. Every image either described or hidden
5. Focus order follows RTL reading direction
