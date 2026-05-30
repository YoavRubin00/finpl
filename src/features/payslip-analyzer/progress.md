# Payslip Analyzer — Ralph Loop Progress

**Master plan:** `C:\Users\yrubi\.claude\plans\woolly-petting-bonbon.md`
**Convention:** Each chunk = ≤10 min autonomous work + `npx tsc --noEmit` at the end + mark `[DONE]` here.

## Loop instructions (read this every iteration)

1. Open this file and find the **first** chunk with status `[TODO]`.
2. Implement ONLY that chunk. Do not skip ahead.
3. Follow the 4-step pattern from `CLAUDE.md`: (a) Schema/Types, (b) Logic/Store, (c) UI/Animations, (d) `npx tsc --noEmit` — but each chunk below is already scoped to one of these.
4. Reuse existing components: `GlowCard`, `SupercellButton`, `SharkTipModal`, `SharkLoveModal`, `AnimatedPressable`, `finnMascotConfig`.
5. **No `any`. Strict TS.** All Hebrew strings RTL.
6. After implementing, run `npx tsc --noEmit` and fix any new errors introduced by THIS chunk only.
7. Mark the chunk `[DONE]` here and stop. The loop will re-fire and pick the next one.
8. If you hit a blocker that requires user input, mark the chunk `[BLOCKED — reason]` and stop.

---

## Already done (do NOT redo)
- `[DONE]` package.json: added `expo-document-picker ~14.0.7`, `expo-image-picker ~17.0.8`, `expo-image-manipulator ~14.0.7`, `expo-file-system ~19.0.16`. `npm install` ran successfully.
- `[DONE]` `app/api/ai/_prompts/payslipSharkPrompt.ts` — system prompt + `buildPayslipUserPrompt(name, goal)`.
- `[DONE]` folders: `src/features/payslip-analyzer/`, `components/`, `lib/`.

---

## Chunk 1 — Schema & types  `[DONE]`
**Files to create:**
- `src/features/payslip-analyzer/types.ts`

**Contents:**
- `PayslipPhase = 'idle' | 'file_chosen' | 'analyzing' | 'success' | 'error'`
- `ChosenFile { uri, mimeType, byteSize, previewUri, displayName }`
- `PayslipDeduction { kind, label, amount }` with kinds: `income_tax | bituach_leumi | mas_briut | pension_employee | keren_hishtalmut | other`
- `PayslipMetric { kind, label, value, unit }` with kinds: `pension_employer | severance | vacation_days | sick_days | credit_points | employer_cost | hourly_rate | overtime_hours`; units: `ILS | days | points | hours | count`
- `PayslipAnomaly { severity: 'info' | 'warn' | 'critical', code: string, title, description, suggestion }`
- `PayslipResult { confidence, payPeriod, brutto, netto, totalDeductions, deductions[], metrics[], anomalies[], sharkSummary, actionItems[] }`
- `PayslipAnalyzeRequest { fileBase64, mimeType, byteSize, name?, financialGoal? }`
- `PayslipErrorCode = 'unreadable' | 'not_a_payslip' | 'parse_failed' | 'invalid_mime' | 'file_too_large' | 'rate_limited' | 'service_unavailable' | 'timeout' | 'network' | 'unknown' | 'picker_cancelled' | 'password_pdf'`
- `PayslipAnalyzeError { ok: false; code: PayslipErrorCode; error: string }`
- `PayslipAnalyzeSuccess { ok: true; confidence: number; result: PayslipResult }`
- `PayslipAnalyzeResponse = PayslipAnalyzeSuccess | PayslipAnalyzeError`

**Modify:**
- `src/types/economy.ts` — extend `XPSource` with `'payslip_first' | 'payslip_repeat'`.

**Verify:** `npx tsc --noEmit` clean.

---

## Chunk 2 — Backend API route  `[DONE]`
**File to create:**
- `app/api/ai/payslip-analyze+api.ts`

**Mirror the style of `app/api/ai/insights+api.ts` (direct REST fetch to Gemini, NOT the SDK).**

**Implementation:**
1. Import `enforceRateLimit`, `safeErrorResponse`, `sanitizeString` from `../_shared/*`.
2. Import `PAYSLIP_SYSTEM_PROMPT`, `buildPayslipUserPrompt` from `./_prompts/payslipSharkPrompt`.
3. `enforceRateLimit(request, 'ai-payslip-min', { limit: 3, windowSec: 60 })` AND `enforceRateLimit(request, 'ai-payslip-hour', { limit: 10, windowSec: 3600 })` — call both; return early if either blocks.
4. Validate body: `fileBase64` string ≤ 16MB, `mimeType` in allowed set (`image/jpeg|image/png|image/webp|image/heic|application/pdf`), `byteSize` number.
5. Size limits: image ≤4MB raw, PDF ≤8MB raw. Sanity-check decoded base64 length matches `byteSize ± 4`.
6. Magic bytes check: decode first ~12 base64 bytes; PDF must start with `%PDF`, JPEG with `FF D8 FF`, PNG with `89 50 4E 47`. WebP and HEIC light-touch (allow without strict magic).
7. Build Gemini request body:
   ```js
   {
     system_instruction: { parts: [{ text: PAYSLIP_SYSTEM_PROMPT }] },
     contents: [{
       role: 'user',
       parts: [
         { text: buildPayslipUserPrompt(sanitizedName, financialGoal) },
         { inline_data: { mime_type: mimeType, data: fileBase64 } }
       ]
     }],
     generationConfig: {
       maxOutputTokens: 2048,
       temperature: 0.2,
       thinkingConfig: { thinkingBudget: 0 },
       responseMimeType: 'application/json',
     }
   }
   ```
8. Fetch with `AbortSignal.timeout(45_000)`. On abort → `code: 'timeout'`.
9. Parse `data.candidates[0].content.parts[0].text` as JSON.
10. Hand-rolled validator `isPayslipResult(value: unknown): value is PayslipResult` — check every field, every kind enum, every numeric range. Cap arrays to max sizes (15/15/10/5).
11. If `confidence < 0.4` → return `{ ok: false, code: 'unreadable', error: '...' }` with status 200 (so client can still render the SharkTipModal).
12. Set response headers: `Cache-Control: no-store, no-cache, must-revalidate, private`, `Pragma: no-cache`.
13. **NEVER log `fileBase64` or decoded bytes**. `safeErrorResponse` only logs error messages.
14. Add `export const maxDuration = 60;` at top of file if Vercel supports it (matches their convention).

**Verify:** `npx tsc --noEmit` clean.

---

## Chunk 3 — Zustand stores  `[DONE]`
**Files to create:**
- `src/features/payslip-analyzer/usePayslipAnalyzerStore.ts` — ephemeral, NO `persist` middleware.
- `src/features/payslip-analyzer/usePayslipMetaStore.ts` — tiny persisted store using MMKV (follow pattern from `src/features/daily-challenges/use-daily-challenges-store.ts` for MMKV storage adapter); fields: `everUsed: boolean`, `dailyCount: number`, `lastDate: string`, `legalAcceptedAt: number | null`.

**Analyzer store API:**
- State: `phase, file, result, errorCode, rewardGranted`.
- Actions: `chooseFile(file), startAnalyzing(), setResult(result), setError(code), markRewardGranted(), clearAll()`.

**Verify:** `npx tsc --noEmit` clean.

---

## Chunk 4 — Lib helpers (preprocess, upload, validate, error copy)  `[DONE]`
**Files to create under `src/features/payslip-analyzer/lib/`:**

1. **`preprocessImage.ts`** — `expo-image-manipulator`. Downscale to width 1600px (preserve aspect), JPEG quality 0.85, format JPEG. Returns `{ uri, byteSize }`. Skip if image already smaller than 1600px and < 1.5MB. For PDFs, pass through unchanged.
2. **`clientValidate.ts`** — `validateFile(file)` returns `{ ok: true } | { ok: false, code: PayslipErrorCode }`. Checks MIME whitelist + size limits (image ≤4MB, PDF ≤8MB).
3. **`uploadFile.ts`** — `analyzePayslipFile(file, { name, financialGoal })` → POST to `/api/ai/payslip-analyze` with base64 body, 50s `AbortController`, returns typed `PayslipAnalyzeResponse`. Maps fetch errors to `code: 'network'`. Uses `expo-file-system` `readAsStringAsync(uri, { encoding: 'base64' })`.
4. **`errorCopy.ts`** — `ERROR_COPY: Record<PayslipErrorCode, { title, body, cta }>` with full Hebrew copy per the matrix in the plan. Used by SharkTipModal.
5. **`rewardPolicy.ts`** — `grantPayslipReward()` → reads/writes `usePayslipMetaStore`, dispatches to `useEconomyStore.addXP/addCoins` with tags `payslip_first` / `payslip_repeat`. Daily cap 4 (1 first + 3 repeats). Returns `{ xp, coins, isFirstTime, capped }`.

**Verify:** `npx tsc --noEmit` clean.

---

## Chunk 5 — Legal disclaimer + gate  `[DONE]`
**Files to create:**
- `src/features/payslip-analyzer/lib/legalDisclaimer.ts` — exports `LEGAL_DISCLAIMER_SHORT` (≤180 chars, used in result footer + upload screen chip) and `LEGAL_DISCLAIMER_FULL` (full Hebrew text for gate modal).
- `src/features/payslip-analyzer/components/LegalGateModal.tsx` — modal shown ONCE before first use. Contains: full disclaimer + checkbox "קראתי והבנתי" + "אני מאשר/ת" button (disabled until checkbox). On confirm → sets `legalAcceptedAt: Date.now()` in `usePayslipMetaStore`, calls `onAccepted()`. Use RN `Modal`, Reanimated `FadeInUp`, RTL.

**Full disclaimer text (LEGAL_DISCLAIMER_FULL) — Hebrew:**
- "כלי FinPlay לניתוח תלוש שכר הוא **כלי חינוכי בלבד**, לא תחליף לייעוץ מקצועי."
- "הניתוח מבוסס על בינה מלאכותית ועלול לכלול **שגיאות, אי-דיוקים, או החמצות**. אסור להסתמך עליו לקבלת החלטות פיננסיות, מס, או משפטיות."
- "FinPlay, יוצריה ושותפיה **אינם רואי חשבון, יועצי מס, או יועצים פיננסיים מוסמכים**. כל תוכן הניתוח, ההסברים והאזהרות הם **מידע כללי לצורכי לימוד**."
- "**לקבלת ייעוץ מחייב פנו לרואה חשבון, יועץ מס, או נציג ועד עובדים מוסמכים.**"
- "**פרטיות:** הקובץ שתעלו נשלח לשירות בינה מלאכותית של Google (Gemini), מנותח, ומוחזר. **אנחנו לא שומרים את הקובץ או את תוצאות הניתוח** על השרת או על המכשיר אחרי שתסגרו את המסך."
- "**הסכמה:** השימוש בכלי מהווה הסכמה לתנאים אלו ולכך שאף צד לא יישא באחריות לנזק, אובדן, או החלטה שתתקבל על בסיס הניתוח."

**Short disclaimer (LEGAL_DISCLAIMER_SHORT):** "כלי חינוכי בלבד. לא תחליף לרואה חשבון מוסמך. הקובץ נמחק עם סגירת המסך."

**Verify:** `npx tsc --noEmit` clean.

---

## Chunk 6 — UI components A (upload + loading + banner)  `[DONE]`
**Files to create under `src/features/payslip-analyzer/components/`:**
1. **`SharkAccountantBanner.tsx`** — pinned top stage. Receives `mood: 'hello' | 'happy' | 'tablet' | 'talking' | 'dancing' | 'empathic' | 'fire'`. Renders matching `FINN_*` asset with breathing/bobbing loop. Speech bubble component overlaid (left side in RTL, tail pointing to shark). Uses Reanimated. Honors `useReducedMotion()`.
2. **`UploadDropzone.tsx`** — GlowCard with purple glow. Two `SupercellButton` (העלה / צלם). Trust chips row (3 chips: Lock/Trash2/Sparkles). Calls `expo-document-picker` and `expo-image-picker` respectively. On result → `preprocessImage` (if image) → `clientValidate` → `chooseFile()` to store. Errors → `setError(code)`.
3. **`AnalyzingState.tsx`** — 4 skeleton row cards (use `LinearGradient` shimmer or simple opacity-pulse animation). Each card stagger offset 180ms.

**Verify:** `npx tsc --noEmit` clean.

---

## Chunk 7 — UI components B (result + anomaly + orchestrator)  `[DONE]`
**Files to create:**
1. **`components/AnomalyRow.tsx`** — receives `PayslipAnomaly`. Renders card with `severity`-specific bg color (celebrate green / tip neutral / warning amber / critical red). Left accent bar 4px. Critical → border pulse loop. Expandable detail on tap.
2. **`components/ResultCard.tsx`** — hero summary card (brutto/netto count-up using a `CountingText` helper — if not in codebase, create a small one inline using Reanimated `useSharedValue` + `useAnimatedReaction`). Detail rows for deductions (tap → bubble swap). Metrics chips. List of `AnomalyRow`. Footer with `LEGAL_DISCLAIMER_SHORT`.
3. **`PayslipAnalyzerScreen.tsx`** — orchestrator. Reads `phase` from store. Renders `SharkAccountantBanner` (top), then based on phase: `UploadDropzone` / preview-and-analyze button / `AnalyzingState` / `ResultCard`. On mount: if `legalAcceptedAt` is null → show `LegalGateModal`. On unmount: `clearAll()` + `FileSystem.deleteAsync(file.uri, { idempotent: true })`. Error states → `SharkTipModal` with copy from `errorCopy.ts`. On success: trigger `grantPayslipReward()`, show `SharkLoveModal` if first time, else `FlyingRewards` if it exists (else inline toast).
4. **`app/payslip-analyzer.tsx`** — route file, exports the screen as default.

**Verify:** `npx tsc --noEmit` clean.

---

## Chunk 8 — Integration A (Home FAB)  `[DONE]`
**Files to create:**
- `src/features/payslip-analyzer/PayslipAnalyzerFAB.tsx` — pill button, right side in RTL, mirrors CaptainSharkFAB style but with `FINN_TABLET` + label "נתח תלוש". Breathing animation. Honors `useReducedMotion()`. Optional NEW badge if `!everUsed`.

**Files to modify:**
- `src/features/pyramid/DuoLearnScreen.tsx` — render `<PayslipAnalyzerFAB />` near the existing `scrollFAB`. Position `right: 20, bottom: 80` (stacked above scrollFAB). Find the scrollFAB JSX and add as sibling.

**Verify:** `npx tsc --noEmit` clean + visual check that FAB does not collide with CaptainSharkFAB (left side).

---

## Chunk 9 — Integration B (mod-1-5 bonus card)  `[DONE]`
**Files to create:**
- `src/features/payslip-analyzer/PayslipBonusCard.tsx` — GlowCard with light-blue chapter-1 glow, shimmer. Shark mascot (small) + text + small SupercellButton "בוא ננתח". Pushes `/payslip-analyzer`.

**Files to modify:**
- `src/features/chapter-1-content/LessonFlowScreen.tsx` — locate the `phase === 'summary'` branch. Add `mod?.id === 'mod-1-5' &&` conditional rendering of `<PayslipBonusCard />` above the next-module CTA. Animation: `FadeInDown.delay(900).springify().damping(14)`.

**Verify:** `npx tsc --noEmit` clean.

---

## Chunk 10 — Route registration + final QA  `[DONE]`
**Files to modify:**
- `app/_layout.tsx` — register the new route: `<Stack.Screen name="payslip-analyzer" options={{ headerShown: false, presentation: 'card' }} />`.

**Implementation note:** Root `app/_layout.tsx` uses `<Slot />` (not `<Stack>`); file-based routes auto-register via `app/payslip-analyzer.tsx`. The actual registration needed in this codebase is adding `"payslip-analyzer"` to the `inContentRoute` allowlist in the auth-redirect effect — otherwise the guard would bounce the route back to `(tabs)`. Done.

**Final verification:**
1. `npx tsc --noEmit` → no NEW errors introduced by this chunk (only pre-existing missing-module-declaration errors that affect the entire codebase).
2. No `console.log` of `fileBase64` anywhere in the repo.
3. No `any` introduced in `src/features/payslip-analyzer/**`, `app/api/ai/payslip-analyze+api.ts`, or `app/payslip-analyzer.tsx`.
4. Privacy cleanup verified at `PayslipAnalyzerScreen.tsx:186-197` — unmount effect calls `FileSystem.deleteAsync(uri, { idempotent: true })` and `clearAll()`.

---

## ✅ Feature complete — ready for `npx expo start` smoke test.