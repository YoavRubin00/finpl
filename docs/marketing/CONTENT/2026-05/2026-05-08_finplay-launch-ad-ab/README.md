# FinPlay Launch — A/B CTA Test (2026-05-08)

> 10 קריאייטיבים סטטיים 9:16 לאינסטגרם, A/B על CTA בלבד.

## הקבצים בתיקייה

| קובץ | מה זה |
|---|---|
| [brief.md](brief.md) | הקשר, מטרות, פרסונה, היפותזות |
| [prompts.md](prompts.md) | 10 פרומפטים של Nano Banana 2 — מוכנים להעתקה |
| [ctas.md](ctas.md) | 10 CTAs + מפרט מלא של overlay (פונט, צבע, מיקום) |
| [ab-test-tracking.md](ab-test-tracking.md) | טמפלייט תוצאות הטסט |
| [outputs/](outputs/) | ⚠️ ריקה — צריך להפיק את 10 התמונות |

---

## ⚠️ הסטטוס כרגע

**Claude לא יכול להפיק את התמונות בעצמו.**

הסביבה הנוכחית (macOS, פרויקט `itayschwartz`) **חסרה את MCP של Higgsfield** שמתואר ב-[CLAUDE.md](../../../CLAUDE.md). אין כלי `mcp__higgsfield__nano_banana_2`, אין `mcp__higgsfield__balance`, ואין CLI `hf` (ה-CLAUDE.md מצביע על נתיב Windows `C:\Tools\higgsfield\hf.exe`).

מה שכן מוכן:
- ✅ brief מלא
- ✅ 10 פרומפטים מלאים (locked visual + scene variations) — מוכנים להעתקה ל-Higgsfield UI
- ✅ 10 CTAs + מפרט overlay מלא
- ✅ טופס מעקב תוצאות

מה שצריך אתה לעשות (5 דקות עבודה ידנית או הגדרה חד-פעמית של MCP):

---

## איך להמשיך — 2 מסלולים

### מסלול A: ידני ב-Higgsfield UI (הכי מהיר עכשיו)

1. פתח [https://higgsfield.ai](https://higgsfield.ai) בדפדפן
2. Image → Nano Banana 2
3. עבור על [prompts.md](prompts.md). לכל אחד מ-10 הפרומפטים:
   - העתק את הפרומפט המלא (Locked Core + Scene Variation)
   - הדבק לתוך Higgsfield
   - הגדר aspect 9:16
   - Generate
   - הורד את התוצאה לתיקייה `outputs/` עם השם הנכון (ראה prompts.md)
4. בדוק QA לפי הצ'קליסט בסוף [prompts.md](prompts.md)
5. עבור ל-CapCut/Canva והוסף את ה-CTA overlay לפי [ctas.md](ctas.md)
6. תעד ב-Google Sheet `1Jr3tc-FE1` (generation_id, prompt, output, cost, date)

זמן משוער: 30-40 דקות לכל 10 הגנרציות + ~1-2 שעות ל-overlays.

### מסלול B: התקנת MCP של Higgsfield ב-Claude Code (חד-פעמי, אחרי זה אוטומטי)

אם תרצה שאני אוכל להפיק עתיד ב-CLI, צריך להוסיף ל-Claude Code את ה-MCP. אם יש לך מפתח API של Higgsfield:

```bash
# פסבדו-פקודה — הפקודה האמיתית תלויה ב-Higgsfield API spec ו-Claude MCP server
claude mcp add higgsfield --command="<higgsfield-mcp-binary>" --env HIGGSFIELD_API_KEY=...
```

או דרך claude UI: Settings → MCP Servers → Add Server.

תגיד לי "תתקין MCP" ואני אבדוק אם יש server רשמי / איך להתקין נכון. מאז שנתקין — יוכל להפיק את 10 התמונות בריצה אחת ולשמור ל-`outputs/` אוטומטית.

---

## אחרי שתפיק את התמונות

חזור אליי עם:
- "התמונות ב-outputs/ — תכין את ה-overlays?" → אעשה את ה-mockup הראשון ב-Canva/Figma SVG אם רוצים.
- "תיעדתי ב-Google Sheet" → אאמת מה תועד.
- "התחיל הטסט, יום 1 תוצאות..." → אעדכן את [ab-test-tracking.md](ab-test-tracking.md) ואעשה ניתוח ראשון.
