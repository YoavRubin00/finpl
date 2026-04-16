# PRD: Shark Content Accuracy (דר כריש)

**Status:** Active  
**Source:** פרופ׳ כריש audit 2026-04-16  
**Scope:** Fix factual errors and stale 2025 values in chapter data and simulation data.

All work is DATA ONLY — no new components, no new screens, no logic changes. Edit existing strings/numbers in `.ts` files.

---

## User Stories

### US-001 — Fix employer pension split (חוק פנסיה חובה)
- [x] Target: `src/features/chapter-2-content/chapter2Data.ts`
- **Current (wrong):** "המעסיק מפקיד 6.5% נוספים" (line ~323)
- **Fix to:** "המעסיק מפקיד 6.5% תגמולים + 6% פיצויים — סה״כ 12.5%"
- Also review line ~289 "מרכיב פיצויים 8.33%" — under חוק פנסיה חובה the minimum employer פיצויים is **6%**; 8.33% is the סעיף 14 option (not universal). Clarify wording.
- **Acceptance:**
  - [x] Text reflects 12.5% total employer contribution
  - [x] 8.33% framed as סעיף 14 option, not universal
  - [x] Typecheck passes

### US-002 — Fix קרן השתלמות early-withdrawal tax rate
- [x] Target: `src/features/chapter-2-content/chapter2Data.ts` (question `q-2-13-3` ~line 500)
- **Current (wrong):** "47% או 35%" (35% is קופת גמל, not השתלמות)
- **Fix to:** "47% + ביטוח לאומי" (remove the 35% — it's wrong for השתלמות)
- **Acceptance:**
  - [x] Answer reflects 47% + ביטוח לאומי only
  - [x] Typecheck passes

### US-003 — Fix top income tax bracket reference
- [x] Target: `src/features/chapter-2-content/chapter2Data.ts` (~line 500, successFeedback)
- **Current (wrong):** References max bracket as "47%"
- **Fix to:** "50% (47% + מס יסף 3% על הכנסות גבוהות)"
- **Acceptance:**
  - [x] Max rate stated as 50%, with מס יסף breakdown
  - [x] Typecheck passes

### US-004 — Fix S&P 500 annual returns in indexRaceData
- [x] Target: `src/features/chapter-4-content/simulations/indexRaceData.ts` (~lines 22-25)
- **Current (wrong/inconsistent):**
  - 2014: +11% → should be **+13.7%** (total return)
  - 2020: +16% → should be **+18.4%** (total return)
- **Policy:** Pick one convention — if the file uses total return (consistent with AAPL 2019 +89%), all years must be total return.
- **Fix:** Convert all S&P 500 years to **total return** (dividends reinvested). Correct values 2011-2020:
  - 2011: +2.1%, 2012: +16.0%, 2013: +32.4%, 2014: +13.7%, 2015: +1.4%, 2016: +12.0%, 2017: +21.8%, 2018: −4.4%, 2019: +31.5%, 2020: +18.4%
- **Acceptance:**
  - [x] All S&P 500 values are total-return, consistent with other assets
  - [x] Numbers match the published list above (±0.1% rounding)
  - [x] Typecheck passes

### US-005 — Fix ETH 2015 return (cannot be 0)
- [x] Target: `src/features/chapter-4-content/simulations/indexRaceData.ts`
- **Current (wrong):** ETH 2015 = 0
- **Fact:** ETH launched July 2015 at ~$0.75, ended 2015 at ~$0.95 → **+27%** for partial-year or set to +5% if the file treats 2015 as full calendar year
- **Fix:** Replace 0 with **0.27** (or document the partial-year caveat in a comment)
- **Acceptance:**
  - [x] ETH 2015 is non-zero, represents actual post-launch return
  - [x] Typecheck passes

### US-006 — Refresh stale 2025 values to 2026
- [ ] Target: `src/features/chapter-3-content/chapter3Data.ts` + `src/features/myth-or-tachles/` data files
- **Updates needed:**
  - קופת גמל להשקעה annual cap: `83,641` → `84,047` (2026 linked update)
  - תקרת הפטור לפיצויים: `13,750` → `14,080` (2026)
  - קצבת זקנה בסיסית "(2025)" annotation — drop the year label or update to `1,795` (2026 January update)
  - BoI rate anchor in `chapter3Data.ts:49` finnTip — update "2022-2023 עלתה ל-4.75%" to reflect current 2025-2026 cutting cycle
- **Acceptance:**
  - [ ] All four numeric values updated
  - [ ] BoI rate context reflects 2025-2026 reality
  - [ ] Typecheck passes

### US-007 — Fix overselling of Irish ETFs
- [ ] Target: `src/features/chapter-4-content/chapter4Data.ts:~308`
- **Current:** "קרן סל אירית... מנכה רק 15% מס... פתרון מנצח... חוסכת ים של כסף"
- **Issue:** Oversells savings. Real delta vs VOO ≈ **0.3-0.4% per year** in dividend drag — meaningful for long-horizon investors, not "ים של כסף"
- **Fix:** Tone down to accurate framing: "החיסכון על דיבידנדים ~0.3-0.4% בשנה — משמעותי לטווח ארוך, לא דרמטי לטווח קצר"
- **Acceptance:**
  - [ ] No "ים של כסף" hyperbole
  - [ ] Accurate delta quantified
  - [ ] Typecheck passes

### US-008 — Clarify nominal vs real return (10% annual)
- [ ] Target: `src/features/chapter-4-content/chapter4Data.ts:~182`
- **Current:** "המדד הניב היסטורית כ-10% שנתי ממוצע"
- **Issue:** Nominal. Chapter 4 later discusses תשואה ריאלית — users deserve the distinction upfront.
- **Fix:** "~10% נומינלי (לפני אינפלציה), ~6.5-7% ריאלי (אחרי אינפלציה)"
- **Acceptance:**
  - [ ] Both nominal and real returns stated
  - [ ] Typecheck passes
