# Brief — קמפיין השקה FinPlay (A/B test על CTA)

> **תאריך**: 2026-05-08
> **סוג קמפיין**: השקת MVP — paid social Instagram
> **סטטוס**: ready for generation

---

## מטרת הקמפיין

לרכוש הורדות ראשונות של אפליקציית FinPlay ולזהות את ה-CTA שמניע את ה-CTR/install הגבוה ביותר, כדי לסקיילר את הקמפיין הראשי על המסר המנצח.

## מטרת ה-A/B Test

**משתנה יחיד נבחן: CTA בלבד.**
ויזואל מקובע, audience זהה, פלייסמנט זהה. ההבדל היחיד בין 10 הקריאייטיבים הוא ניסוח הקריאה לפעולה.

### היפותזה ראשית
לקהל Gen Z ישראלי שמתחיל לעבוד ראשית — **שפת gaming ("שחק", "רמה", "XP", "שכבוש") מנצחת CTA פיננסי-תפעולי קונבנציונלי ("הורד", "התחל").**

### היפותזות משניות
- low-commit framings ("רמה אחת", "5 דקות") < direct download
- curiosity gap ("מה הסתירו ממך") > pure benefit
- anti-positioning ("בלי שיעור") יוצר engagement חזק יותר ב-Gen Z

---

## פרסונה ראשית — Maya, 24

מ-[BRAND/brand-kit.md](../../../BRAND/brand-kit.md):

- **גיל**: 22-28, ישראלי דובר עברית
- **שלב חיים**: עבודה ראשונה במשרה מלאה / סטודנטים בסוף תואר / חיילים משוחררים
- **שכר**: 8-15K, שוכרים דירה, אין חיסכון
- **כאב מרכזי**: "לא יודעת מאיפה להתחיל" — אוריינות פיננסית = מאיים, משעמם, לא נגיש
- **רצון**: שליטה בכסף בלי הרגשה של "שיעור"
- **שפה**: "בא מהבית", "לא נופל לי", "סדרים בנייר", "בנק = גזל", "לעשות אקזיט"
- **בילי אונליין**: TikTok, Instagram Reels, יוצרי תוכן פיננסיים (Maya Margolin), Discord/WhatsApp groups

## מסר מרכזי

> "הכסף לא צריך להיות מלחיץ. בוא נשחק קצת."

**Anti-positioning** (מה אנחנו לא): קורס, ברוקר, אפליקציית tracking, מטיף.

---

## פרמטרי הקמפיין

| פרמטר | ערך |
|---|---|
| פלטפורמה | Instagram (Feed Ads + Stories Ads + Reels Ads) |
| פורמט | Static image 9:16 (1080×1920) |
| משתנה A/B | CTA only (10 ניסוחים) |
| תקציב | TBD (ראה Meta Ads setup) |
| משך הטסט | TBD — מינימום עד significance (~7-14 ימים) |
| Target audience | Gen Z ישראלי 22-28, מעניינים: פיננסים, lifestyle, gaming, יוצרי תוכן ישראלים |
| הוצאה | להגיע ל-link in bio / app store |

## KPIs

ראשיים:
- **CTR** (click-through rate)
- **Install rate** (CTR × app store conversion)
- **CPI** (cost per install)

משניים:
- Engagement rate (likes, saves, shares)
- Comment sentiment (Hebrew, qualitative)

---

## Visual Concept (locked across all 10)

ויזואל מקובע, פרימיום, fintech.

> **Premium 3D-rendered FinPlay coin hero** על רקע גרדיאנט deep blue (#0A1F44) → cyan (#00B7C3). אלמנטי משחק זעירים מרחפים סביב (micro-coins, XP burst sparkles, level-pyramid silhouette ב-bokeh). ליטוש Apple iOS — חד, נקי, expensive. שליש תחתון פנוי לחלוטין ל-CTA overlay.

הפרומפטים המלאים: ראה [prompts.md](prompts.md).

---

## דליברבלים

- [x] brief זה
- [ ] [prompts.md](prompts.md) — 10 פרומפטים מלאים של Nano Banana 2
- [ ] [outputs/](outputs/) — 10 PNG 4K (מבוצע ע"י המשתמש ב-Higgsfield)
- [ ] [ctas.md](ctas.md) — 10 CTAs + overlay specs (פונט, גודל, מיקום, צבע)
- [ ] [ab-test-tracking.md](ab-test-tracking.md) — טמפלייט תוצאות

---

## חוקי ברזל מהמותג שמופעלים פה

מ-[CLAUDE.md](../../../CLAUDE.md) ו-[BRAND/voice.md](../../../BRAND/voice.md):

1. **אין טקסט במודל** — Nano Banana לא יוצר אותיות (CTA נוסף ב-overlay בפוסט)
2. **אין לוגו FinPlay** במודל — רק ב-overlay (אופציונלי)
3. **שפה: עברית בלבד** לכל copy פונה לקהל
4. **ללא "פורטפוליו"** וללא איומים ("אם לא תחסוך…")
5. **Voice**: ישיר, גיימינג, גובה עיניים
