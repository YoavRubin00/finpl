# PRD: Auth Screens Redesign

## Introduction
Redesign the authentication flow with proper registration and login screens. Replace the current name-only sign-in with a full registration form (name, email, password with strength indicator, terms checkbox) and a separate login screen. Add "forgot password" flow. The design follows the FinPL Gaming-Neon branding with a fun mascot character.

## Goals
- Full registration with email + password (replacing name-only entry)
- Real-time password strength indicator (weak/medium/strong)
- Password confirmation field
- Terms of service checkbox (required) with link to static terms page
- Separate login screen with "forgot password" link
- RTL-ready Hebrew UI matching the provided design mockup
- Mascot character at top of auth screens

## User Stories

### US-001: Auth types update
**Description:** As a developer, I want updated auth types so the store can hold email and password hash.

**Acceptance Criteria:**
- [x] Add `email: string` field to `AuthState` in `useAuthStore.ts`
- [x] Add `PasswordStrength` type (`"weak"` | `"medium"` | `"strong"`) to `src/features/auth/types.ts`
- [x] Add helper function `getPasswordStrength(password: string): PasswordStrength` to new file `src/features/auth/password-utils.ts` — rules: <6 chars = weak, 6-7 chars or missing number/letter = medium, 8+ with letter+number+special = strong
- [x] Update `signIn` action to accept `email` parameter alongside `displayName`
- [x] Typecheck passes

### US-002: Registration screen UI
**Description:** As a new user, I want a registration form so I can create an account with email and password.

**Acceptance Criteria:**
- [x] Create `src/features/auth/RegisterScreen.tsx` with: mascot image at top, app title "FinPL", subtitle "חינוך פיננסי. הדור הבא."
- [x] Form fields: full name, email, password (with eye toggle), confirm password
- [x] All labels and placeholders in Hebrew (שם מלא, אימייל, סיסמה, אישור סיסמה)
- [x] Password strength indicator below password field — colored bar + Hebrew text (סיסמה חלשה / בינונית / חזקה) using `getPasswordStrength`
- [x] "הירשם" (Register) button disabled until: name ≥2 chars, valid email, password strength ≥ medium, passwords match, terms accepted
- [x] Link at bottom: "כבר יש לך חשבון? לחץ כאן" navigates to sign-in
- [x] Dark theme (#09090b background), neon-violet accents
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-003: Terms of service checkbox + page
**Description:** As a user, I want to review terms of service before registering.

**Acceptance Criteria:**
- [x] Add checkbox row to RegisterScreen: "אני מסכים לתנאי השימוש והתקנון" with checkbox on the right (RTL)
- [x] "תנאי השימוש והתקנון" is a clickable link (underlined, neon-violet color)
- [x] Create `app/(auth)/terms.tsx` — static page with placeholder terms text in Hebrew
- [x] Back button on terms page returns to registration
- [x] Registration button disabled when checkbox unchecked
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-004: Login screen UI
**Description:** As a returning user, I want a login screen so I can sign in with email and password.

**Acceptance Criteria:**
- [x] Create `src/features/auth/LoginScreen.tsx` with: same mascot + title header as registration
- [x] Form fields: email, password (with eye toggle)
- [x] "התחבר" (Login) button disabled until email and password are filled
- [x] "שכחתי סיסמה" link below password field
- [x] "אין לך חשבון? הירשם" link at bottom navigates to registration
- [x] Dark theme, neon-violet accents, Hebrew text
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-005: Forgot password screen
**Description:** As a user who forgot their password, I want to request a reset so I can regain access.

**Acceptance Criteria:**
- [x] Create `src/features/auth/ForgotPasswordScreen.tsx`
- [x] Single email input field + "שלח קישור לאיפוס" (Send reset link) button
- [x] On submit: show success message "קישור לאיפוס סיסמה נשלח למייל שלך" (placeholder — no actual email sending yet)
- [x] Back link to login screen
- [x] Dark theme, neon-violet accents
- [x] Typecheck passes
- [ ] Verify changes work in browser

### US-006: Route wiring
**Description:** As a developer, I want the auth routes updated so the new screens are accessible.

**Acceptance Criteria:**
- [x] Update `app/(auth)/sign-in.tsx` to render `LoginScreen` (instead of old `SignInScreen`)
- [x] Create `app/(auth)/register.tsx` rendering `RegisterScreen`
- [x] Create `app/(auth)/forgot-password.tsx` rendering `ForgotPasswordScreen`
- [x] Update `_layout.tsx` auth guard: unauthenticated users go to `/(auth)/sign-in` (login, not register)
- [ ] Navigation between login ↔ register ↔ forgot-password works correctly
- [ ] Typecheck passes
- [ ] Verify changes work in browser

### US-007: Auth store integration
**Description:** As a developer, I want registration and login to persist correctly in the auth store.

**Acceptance Criteria:**
- [ ] `RegisterScreen` calls `signIn(name, email)` on successful registration and navigates to onboarding
- [ ] `LoginScreen` calls `signIn(name, email)` — for MVP uses same store action (no backend auth yet)
- [ ] Email is persisted in auth store via Zustand persist
- [ ] Password validation happens client-side only (no backend yet)
- [ ] Typecheck passes
- [ ] Verify changes work in browser

## Non-Goals
- Backend authentication (Firebase, Supabase, etc.) — MVP is client-side only
- Actual email sending for forgot password
- Social login (Google, Apple)
- Email verification
- Parent/child account linking
- Profile picture upload

## Technical Notes
- Existing `SignInScreen.tsx` will be replaced — keep file for reference until migration complete
- **Mascot image**: Located at `assets/images/mascot.png` — golden bull with a kid in graduation cap on a pile of money/gold. Use `require("../../../assets/images/mascot.png")` via React Native `Image` component. Display at ~180px height, centered, at the top of every auth screen (login, register, forgot-password).
- Password is NOT stored in Zustand/AsyncStorage — only validated client-side during registration
- Email format validation: basic regex check
- The design is RTL (Hebrew) — use `writingDirection: "rtl"` or NativeWind RTL utilities where needed
- Follow existing NativeWind patterns from current `SignInScreen.tsx`
