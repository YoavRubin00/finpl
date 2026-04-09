# PRD 41: Notification Permission Banner (Duolingo Style)

## Overview
Implement a high-visibility, "un-ignorable" banner at the top of the main screen (Learn/Feed) that encourages users to enable push notifications, similar to the Duolingo "You're missing out on reminders!" banner.

**מטרה:** הגדלת שימור המשתמשים (Retention) על ידי הנגשת האישור להתראות בצורה פחות פולשנית ומרתיעה מההודעה המערכתית הרגילה.

---

## Core Features

### 1. Notification Permission Banner
- **Placement**: Sticky or absolute at the top of the `DuoLearnScreen` or `FinFeedScreen`.
- **Visuals**:
  - Sky blue background (#00A2F3).
  - Finn mascot emoji or Lottie (Finn with a bell 🔔).
  - Text: "You're missing out on reminders from Finn!" / "אתה מפספס תזכורות מפין!"
  - CTA Button: "ALLOW" / "אשר" (White background, Blue text).
- **Dismissible**: X button or swipe to dismiss if the user rejects it multiple times.

### 2. Smart logic
- **Visibility**: Only show if `permissionStatus` is not `granted` and the user hasn't explicitly dismissed it in this session.
- **Trigger**: Tapping "ALLOW" fires the system permission prompt (`requestPermission`).

---

## Technical Architecture
- **Component**: `NotificationPermissionBanner.tsx`.
- **State**: Use `useNotificationStore` to track `permissionGranted` and a new `bannerDismissed` flag.
- **Integration**: Insert into `DuoLearnScreen` and `FinFeedScreen` top layouts.

---

## User Stories

### US-001: The Banner Component
- **Criteria**: Renders at the top of the screen with Duo-style blue theme and Finn mascot.

### US-002: Active Permission Logic
- **Criteria**: Tapping the CTA button triggers the native notification permission dialog. If granted, the banner disappears forever.

### US-003: Session Management
- **Criteria**: If dismissed, the banner stays hidden for the current session to avoid annoyance.

---

## Acceptance Criteria
- [ ] Banner matches the screenshot provided by the user (Duo style).
- [ ] Correctly reflects the `expo-notifications` permission state.
- [ ] CTA button successfully triggers the system prompt.
- [ ] Accessible and responsive in both Dark and Light modes.
