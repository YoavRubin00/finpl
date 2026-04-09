# PRD 45: Settings & Activation — הפעלת כל הרכיבים ב"עוד"

## Introduction

מסך "עוד" (MoreScreen) מכיל מספר פריטים שמפנים ל-`handleComingSoon` (alert "בקרוב") במקום לפונקציונליות אמיתית. PRD זה מפעיל את כולם: מסך הגדרות מלא, הפעלת התראות, ניהול פרופיל, ומסך משפטי/פרטיות.

## Goals

- הפעלת כל הפריטים ב"עוד" שמציגים "בקרוב"
- מסך הגדרות מלא עם Lottie icons
- ניהול פרופיל (שם, אווטאר, מחיקת חשבון)
- מסך משפטי ופרטיות (טקסט סטטי)
- הפעלת התראות (expo-notifications permission request)

## User Stories

### US-001: SettingsScreen — מסך הגדרות
**Description:** As a user, I want a settings screen so that I can manage my app preferences.

**Acceptance Criteria:**
- [x] Create `src/features/settings/SettingsScreen.tsx`
- [x] Create route `app/settings.tsx` that renders SettingsScreen
- [x] Sections: פרופיל, התראות, כללי
- [x] פרופיל section: שם תצוגה (editable inline), אווטאר נוכחי (navigates to avatar picker)
- [x] התראות section: toggle switch for daily reminder, toggle for chest-ready, toggle for streak-at-risk. Read/write from `useNotificationStore`
- [x] כללי section: "אודות FinPlay" (version string), "משפטי ופרטיות" (navigates to legal screen)
- [x] Each row has a Lottie icon (reuse existing wired-flat assets)
- [x] RTL layout (writingDirection: 'rtl', textAlign: 'right')
- [x] Light theme (white bg, green accents `#16a34a`)
- [x] MoreScreen "הגדרות" row navigates to `/settings` instead of handleComingSoon
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-002: NotificationPermission — הפעלת התראות
**Description:** As a user, I want to enable push notifications from the settings screen.

**Acceptance Criteria:**
- [x] When user toggles daily reminder ON: request expo-notifications permission via `useNotifications.requestPermission()`
- [x] If permission denied: show alert explaining how to enable in system settings
- [x] If permission granted: update `useNotificationStore` state
- [x] Toggle state persisted via Zustand persist
- [x] Show current permission status as subtitle under the toggle
- [x] Typecheck passes

### US-003: ProfileSection — ניהול פרופיל
**Description:** As a user, I want to edit my display name and view my avatar from settings.

**Acceptance Criteria:**
- [x] Display name shown as editable TextInput (tap to edit, blur to save)
- [x] Save display name to `useAuthStore.setDisplayName(name)`
- [x] Avatar row shows current avatar emoji + name, taps to push `/profile`
- [x] Member since date shown (from `useAuthStore.createdAt` or fallback to current date)
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-004: LegalScreen — מסך משפטי ופרטיות
**Description:** As a user, I want to read the terms of service and privacy policy.

**Acceptance Criteria:**
- [x] Create `src/features/settings/LegalScreen.tsx`
- [x] Create route `app/legal.tsx` that renders LegalScreen
- [x] ScrollView with RTL Hebrew text
- [x] Two sections: "תנאי שימוש" and "מדיניות פרטיות"
- [x] Static placeholder text (legal ipsum) — will be replaced later with real content
- [x] Back button (expo-router back)
- [x] Light theme matching SettingsScreen
- [x] MoreScreen "משפטי ופרטיות" row navigates to `/legal` instead of handleComingSoon
- [x] Typecheck passes
- [x] Verify changes work in browser

### US-005: ActivateMoreRows — הפעלת שורות "בקרוב"
**Description:** As a user, I want all "More" menu items to be functional.

**Acceptance Criteria:**
- [x] "פנטזי ליג" row navigates to `/fantasy` (screen already exists) — remove "🚧 בקרוב" badge
- [x] "סקוואדים" row navigates to `/squads` (screen already exists) — remove "🚧 בקרוב" badge
- [x] "חדשות" row navigates to `/finfeed` (reuse main feed) — remove "🚧 בקרוב" badge
- [x] "פריטים שמורים" row shows alert "פיצ'ר PRO — בקרוב" with PRO upsell (different from generic "בקרוב")
- [x] All `handleComingSoon` calls replaced with actual navigation or PRO-specific messaging
- [x] Typecheck passes
- [x] Verify changes work in browser

## Non-Goals

- Real legal content (placeholder is fine for now)
- In-app language switching (Hebrew only for MVP)
- Account deletion flow (just show "contact support" for now)
- Biometric authentication setup
- Dark mode toggle

## Technical Notes

- **Existing stores:** `useNotificationStore` (src/features/notifications/), `useAuthStore` (src/features/auth/)
- **Existing notification hook:** `useNotifications` (src/features/notifications/useNotifications.ts)
- **Existing profile modal:** `EditProfileModal` (src/features/profile/) — can reuse patterns
- **Lottie assets:** All available in `assets/lottie/wired-flat-*`
- **Route pattern:** Feature screens use `app/[name].tsx` with `export default function` for Expo Router
- **Pre-existing TS errors (safe to ignore):** FeedSidebar.tsx, useClashStore.ts, GlassOverlay.tsx
