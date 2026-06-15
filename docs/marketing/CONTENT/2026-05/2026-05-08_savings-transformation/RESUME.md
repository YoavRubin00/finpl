# RESUME — הוראות לסשן הבא

> **לסוכן הבא**: כל ה-prep מוכן. המשימה היא להריץ את ה-generation דרך ה-Higgsfield MCP שהותקן בין הסשנים.

---

## הקשר מהיר

- **רעיון**: Captain Shark — Savings Transformation (פארודיית כושר fitness ל-FinPlay)
- **פורמט**: Reel 9:16, 12s, ללא קריינות
- **רעיון #4** מתוך 5 שאושרו ב-[/Users/itayschwartz/.claude/plans/soft-hatching-feigenbaum.md](/Users/itayschwartz/.claude/plans/soft-hatching-feigenbaum.md)
- **מודל וידאו**: `kling_3_0` (ברירת מחדל מ-CLAUDE.md — לא לשנות)
- **חוק**: אין טקסט/לוגו בתוך הסרטון. כל overlay נוסף ב-CapCut.

## הקבצים החשובים בתיקייה הזו

- [brief.md](brief.md) — מטרה, KPI, קהל
- [storyboard.md](storyboard.md) — 4 shots × 3s + audio plan + mute test
- [prompts.md](prompts.md) — **חלק א** (4 keyframes ל-Nano Banana 2) + **חלק ב** (4 i2v ל-Kling 3.0)
- [publish.md](publish.md) — captions + hashtags ל-3 פלטפורמות
- `outputs/` — איפה לשמור את ה-mp4 וה-png

## צעדי ביצוע — להריץ לפי הסדר

### שלב 0 — בדיקת קרדיטים (קריטי)

```
mcp__higgsfield__balance
```

אם קרדיטים < ~50 — **לעצור ולהודיע למשתמש**. אומדן עלות: 4 keyframes (Nano Banana) + 4 קליפי i2v (Kling 3.0). לבדוק עלות מדויקת ב-MCP לפני generation.

### שלב 1 — 4 keyframes ב-Nano Banana 2

לקחת את 4 הפרומפטים מ-[prompts.md](prompts.md) → "חלק א — Nano Banana 2".
לג'נרט אחד אחרי השני (לא במקביל — כדי לוודא עקביות).

**אחרי כל תמונה**: לשמור ב-`outputs/` עם השם:
- `keyframe-1-week1.png`
- `keyframe-2-week4.png`
- `keyframe-3-week8.png`
- `keyframe-4-week12.png`

### שלב 2 — Consistency check

להציג 4 התמונות למשתמש ולשאול:
- האם 4 הקפטנים נראים כמו אותה דמות?
- האם הצבע הכחול עקבי?
- האם אין טקסט/לוגו אקראי?

אם משהו לא עקבי — להציע לחזור על ה-keyframe הספציפי עם seed שונה.
**רק אחרי אישור משתמש** — להמשיך לשלב 3.

### שלב 3 — 4 קליפי i2v ב-Kling 3.0

לקחת את 4 הפרומפטים מ-[prompts.md](prompts.md) → "חלק ב — Kling 3.0 i2v".
לכל קליפ:
- **input image**: ה-keyframe המתאים מ-`outputs/`
- **model**: `kling_3_0`
- **duration**: 3s

**אחרי כל קליפ**: לשמור ב-`outputs/` עם השם:
- `clip-1-week1.mp4`
- `clip-2-week4.mp4`
- `clip-3-week8.mp4`
- `clip-4-week12.mp4`

### שלב 4 — אישור visual

להציג 4 הקליפים למשתמש ולשאול:
- האם התנועה נכונה לכל stage?
- האם הקפטן נשארת עקבית בין הקליפים?
- האם יש טקסט/הזיות שהמודל הוסיף?

אם משהו לא עובד — לחזור על הקליפ הספציפי עם seed שונה.

### שלב 5 — רישום ב-Google Sheet

```
Sheet ID: 1Jr3tc-FE1...
דרך: gws CLI (אם הותקן) או mcp__claude_ai_Google_Drive__ ידנית
```

לרשום:
- תאריך: 2026-05-08
- נושא: Savings Transformation
- מודלים: Nano Banana 2 (4 keyframes) + Kling 3.0 (4 i2v clips)
- קרדיטים שנוצלו: [למלא לפי balance before/after]
- סטטוס: בייצור (ממתין לעריכה ב-CapCut)

### שלב 6 — להעביר את הכדור למשתמש לעריכה ב-CapCut

לפי [storyboard.md](storyboard.md) — מסך mute test, audio plan, overlay text.
**לא** משימה של הסוכן — זה צד המשתמש.

---

## תקלות שייתכן ותתקלו בהן

- **"insufficient credits"** → לעצור, להודיע למשתמש לטעון.
- **Kling מסרב i2v עם flat-vector image** → לנסות upscale מקדים, או לחלופין לג'נרט עם `kling_3_0` text-to-video עם תיאור הדמות + reference image. לפנות למשתמש לפני בחירת חלופה.
- **Nano Banana הוסיף טקסט** → לחזור עם תוספת `absolutely no text, no letters, no numbers, no captions, no logos` בסוף הפרומפט.
- **קפטן לא עקבי בין keyframes** → להוסיף `same Captain Shark character as keyframe-1, identical face design and proportions, only the muscle definition differs` בפרומפטים 2-4.

---

## עדכון אחרי שהושלם

כשכל הסרטון יוצא טוב והמשתמש אישר — לעדכן:
1. [BRAND/prompt-library.md](../../../BRAND/prompt-library.md) — להוסיף את הפרומפטים שעבדו תחת סקציה חדשה "Captain Shark — Transformation series"
2. [CONTENT/calendar.md](../../calendar.md) — לשנות סטטוס ל"מוכן" או "פורסם"
3. **למחוק את הסעיף "משימה פעילה" מ-CLAUDE.md** (כדי שהסשן הבא לא יחשוב שזה עדיין פעיל)
