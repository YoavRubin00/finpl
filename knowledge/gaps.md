# ⚠️ gaps — פערים ומשימות פתוחות

> פערים שמאיה זיהתה בסריקת הצוות. 4 הפערים המקוריים (G1–G3, G5) **הוכרעו ע"י יואב ובוצעו ב-2026-06-15** — ראה "פערים שנסגרו" למטה. G4 היה אינפורמטיבי בלבד.
> מה שנותר פתוח: **משימת ניקוי-קוד אחת** (Finn→קפטן שארק) הדורשת pass של דבלופר, ולא בתחום ה-MD.

---

## 🔧 פתוח — משימת ניקוי קוד: "Finn" → קפטן שארק (לדבלופר)

**הקנון נקבע (G5):** המסקוט הקנוני היחיד הוא **קפטן שארק**; "Finn" = השם הישן שיצא לגמלאות. המוח (`business-facts`, `brand-voice`) ומסמכי השיווק כבר מיושרים. **הקופי הפונה-למשתמש כבר אומר "קפטן שארק".**

**מה שנותר זה חוב-קוד פנימי** — מזהים, שמות קבצים, נכסים, וקבועים עם `Finn`/`finn`/`FINN_`. **~458 אזכורים ב-~116 קבצי קוד.** זו משימת refactor שמרנית (rename, לא שינוי התנהגות) — **מאיה לא נוגעת בקוד.** ליואב/נווה להחליט אם/מתי לבצע. מוקדים עיקריים:

| אזור | קבצים מרכזיים | סוג |
|---|---|---|
| **תצורת מסקוט (anchor)** | `src/features/retention-loops/finnMascotConfig.ts` (`FinnAnimationState`, `getFinnSource`, `getFinnImage`, `FINN_*`) | מקור הקבועים — נקודת ההתחלה ל-rename |
| **התראות** | `src/features/notifications/finnNotificationCopy.ts`, `useFinnNotificationScheduler.ts` | שם קובץ + קבועים |
| **קומפוננטות מסקוט** | `FinnSpeakingAvatar.tsx`, `FinnNoteTakingAvatar.tsx`, `src/features/fun/FinnMailModal.tsx`, `src/features/sentence-exercise/FinnCoach.tsx` | שמות קומפוננטות/קבצים |
| **נכסים (URLs/paths)** | `assets/IMAGES/finn/finn-profile.png`, `.../finn/finn-arena.png`, blob `finn-videos/finn-chest-open.mp4`, `lottie-dates.json` ("finn.json") | נתיבי נכסים — rename דורש העלאה מחדש/redirect |
| **ייבוא `FINN_*`** | ~100+ קבצי `.tsx` שמייבאים `FINN_STANDARD/HAPPY/DANCING/HELLO` מ-`finnMascotConfig` | חיפוש-והחלפה גורף לאחר rename ה-anchor |
| **PRDs/progress (תיעוד פנימי)** | `PRD34_AIPersonalization.md`, `PRD-ACCESSIBILITY.md`, `retention-loops/progress21.txt` ועוד | טקסט פנימי — אופציונלי |

**גישה מומלצת לדבלופר:** rename ה-anchor (`finnMascotConfig`) קודם, ואז IDE rename-symbol מפיץ ל-`FINN_*` importers; נתיבי נכסים (תמונות/וידאו/lottie) דורשים טיפול נפרד כי הם externalized. **לא דחוף** — שום דבר פונה-משתמש לא מציג "Finn". מומלץ לתזמן עם refactor ממילא מתוכנן.

---

## ✅ פערים שנסגרו (2026-06-15)

### G1 — `docs/marketing/` — ✅ קיים ומלא
התיקייה קיימת: `BRAND/` (content-pillars, voice, brand-kit, soul-ids, prompt-library) + `CONTENT/` (calendar, ideas-bank + ארכיון). **ההפניה השבורה היחידה שנותרה** — כל 5 קבצי BRAND הצביעו ל-`ANALYTICS/instagram-baseline-2026-05.md` שלא היה קיים — **נסגרה:** הקובץ נוצר אדיטיבית, מקורקע בנתונים שכבר היו ב-`brand-kit.md` (16 פוסטים, baseline 2026-05-08), עם סימון "לאמת" על המספרים. anchor של בר עודכן: המסמכים זמינים.

### G2 — `MEMORY.md` — ✅ הופנה ל-`knowledge/`
`/דואו`, `/יפיופי`, `/רטנשן` הצביעו ל-`MEMORY.md` שלא קיים. תוקן אדיטיבית: ההפניה ב-3 הסוכנים → `knowledge/INDEX.md` (המוח המשותף). שורות ה-anchor עודכנו: "MEMORY.md הוחלף ב-`knowledge/`".

### G3 — איתי כמפרסם → יואב + בר — ✅ עודכן
**הכרעת יואב:** מרקטינג מבוצע ע"י **יואב + הסוכן [[בר]]**. תוקן:
- `בר.md` (3 מקומות): שדה "בעלים" בגאנט, שלב "הצמד בעלים", וסעיף "מול הצוות האנושי" — "איתי (מפרסם)" → "יואב + בר".
- `yoatzon.md` (2 מקומות): שורת ניתוב הצוות ושורת ה-anchor — מרקטינג = "יואב + [[בר]]" (איתי עזב).
- `business-facts.md` עודכן בהתאם. **רק אזכורי-איתי-כמפרסם נגעו; עובדת עזיבת איתי נשמרה.**

### G5 — קנון המסקוט: קפטן שארק — ✅ עוגן במוח
**הכרעת יואב:** קפטן שארק בלבד, אין "Finn". עודכן ב-`business-facts.md` + `brand-voice.md` (קנון מפורש + הבהרה ש-Finn בקוד = חוב-קוד פנימי). **הקוד לא נגע** — רוכז במשימת ניקוי-הקוד למעלה.

### G4 — אי-אחידות frontmatter — אינפורמטיבי
תקין (agents vs commands = שני סוגי קבצים). מאיה הוסיפה שורת "טען INDEX" + הפניות knowledge אדיטיבית. אין פעולה נוספת.

---

## מה מאיה כן תיקנה לבד (אדיטיבי/הפיך)
ראה `audits/agent-evals/finplay-brain-2026-06-15.md` ב-OS. בתמצית: בניית `knowledge/` (INDEX + 6 עוגנים), עיגון הסוכנים ב-frontmatter, ביצוע 4 ההכרעות לעיל (אדיטיבי, בלי לגעת בקוד). **שום מחיקת קוד, שום דריסה הרסנית.**
