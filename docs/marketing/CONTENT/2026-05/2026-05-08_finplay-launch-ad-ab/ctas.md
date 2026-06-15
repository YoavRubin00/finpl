# CTAs + Overlay Specs — 10 וריאציות לבדיקה

> 10 ה-CTAs עוברים על-גבי ה-PNG הסטטי בפוסט-פרודקשן (CapCut / Canva / Photoshop).
> **הוויזואל הוא המשתנה הקבוע. ה-CTA הוא המשתנה הנמדד.**
>
> כולם תאמו ל-[BRAND/voice.md](../../../BRAND/voice.md) — direct, gaming, eye-level, ללא איומים, ללא אנגליציזם, ללא "פורטפוליו"/"השקעות חכמות".

---

## 10 CTAs

| # | קובץ סטיל | CTA ראשי | טקסט משני (אופציונלי) | מנגנון | היפותזה |
|---|---|---|---|---|---|
| 01 | `01_direct_download.png` | **הורד חינם** | FinPlay באפ סטור | Direct (Control) | בייסליין השוואה |
| 02 | `02_play_free.png` | **שחק חינם** | המשחק שמלמד אותך לנצח | Gaming reframe | game language > "download" |
| 03 | `03_start_level_1.png` | **תתחיל מרמה 1** | 5 שכבות. כל השליטה. | Onboarding low-commit | barrier נמוך מנצח |
| 04 | `04_xp_reward.png` | **+1XP על ההורדה** | המשחק כבר התחיל | Gamification reward | תמריץ XP כ-hook |
| 05 | `05_ready_to_conquer.png` | **מוכן לשכבוש?** | FinPlay. החל מרמה 1. | Question + brand language | שאלה גוררת engagement |
| 06 | `06_5_min_a_day.png` | **5 דקות ביום** | חיים שלמים של שליטה בכסף | Time framing | התחייבות מינימלית |
| 07 | `07_money_waiting.png` | **הכסף שלך מחכה לך** | תתחיל לשחק | Possession/reward | "כבר שלך" framing |
| 08 | `08_play_one_level.png` | **שחק רמה — תבין הכל** | אפליקציית FinPlay | Promise + low commit | promise CTA אמין |
| 09 | `09_what_they_hid.png` | **תגלה מה הסתירו ממך** | המשחק שמסביר את הכסף | Curiosity gap | FOMO/secret מנצח |
| 10 | `10_order_no_lecture.png` | **סדר בכסף. בלי שיעור.** | FinPlay — המשחק | Anti-positioning | "לא קורס" framing |

---

## Overlay Design Spec

### Typography

| אלמנט | פונט | משקל | גודל | הערה |
|---|---|---|---|---|
| **CTA ראשי** | Heebo | Black (900) | 110pt | עברית מודרני, גיימינג; חלופה: Assistant ExtraBold |
| **טקסט משני** | Heebo | Medium (500) | 38pt | מתחת ל-CTA, יותר עדין |
| **(אופציונלי) לוגו** | אם יש לוגו: SVG ב-200px width | — | — | תחתון-מרכזי, אם רוצים branding |

> שני הפונטים ב-Google Fonts (חינם): [Heebo](https://fonts.google.com/specimen/Heebo), [Assistant](https://fonts.google.com/specimen/Assistant).

### Color

- **טקסט**: `#FFFFFF` (לבן מלא)
- **רקע overlay**: `#0A1F44` ב-40% alpha (deep blue semi-transparent), 24px corner radius — נותן ניגודיות בלי להסתיר את הוויזואל
- **דגש (אופציונלי)**: מילה אחת ב-`#00FFFF` או `#00B7C3` (cyan) — למשל "חינם" או "+1XP" — ליצור focal point

### Position & Layout (1080×1920)

```
┌─────────────────────┐  y=0
│                     │
│                     │
│   [HERO COIN]       │  upper 2/3 — הוויזואל
│                     │
│                     │
│                     │  y=1280
├─────────────────────┤
│                     │
│  ┌───────────────┐  │  overlay box: x=80, y=1380, w=920, h=420
│  │  CTA ראשי    │  │  CTA: y=1500, gold typography
│  │  טקסט משני    │  │  sub: y=1640, smaller
│  └───────────────┘  │
│                     │
└─────────────────────┘  y=1920
```

- **safe area**: 80px margin מכל צד
- **CTA box**: ממורכז אופקית, ב-y=1380 (כ-72% מגובה הפריים)
- **טקסט מיושר**: ימינה (RTL לעברית)
- **Padding בתוך ה-overlay**: 40px

### CTA Hierarchy Rule

חזק → רך:
1. CTA הראשי (110pt לבן) = הקריאה
2. טקסט משני (38pt לבן 80% opacity) = הבהרה / מותג
3. רקע overlay (40% alpha) = נושא ויזואלי

---

## הוראות יצירה ב-CapCut / Canva

### CapCut (מהיר, מובייל-first)

1. New project → 9:16 → Import את ה-PNG
2. Text → Add text → Heebo → Black → 110pt → לבן
3. Position: שליש תחתון, מרכז
4. Background: Add → Shapes → Rectangle → Fill `#0A1F44` 40% → Corner radius 24
5. Layer order: רקע overlay מתחת לטקסט
6. Export: 1080×1920 MP4 frame או PNG

### Canva (דסקטופ, מדויק יותר)

1. Custom size 1080×1920 → Upload PNG
2. Position background to fill frame
3. Add Text → Heebo Black 110pt → Color `#FFFFFF` → אלאיינמנט ימני
4. Add Element → Rectangle → Fill `#0A1F44` opacity 40 → Corner radius 24px
5. Position rectangle behind text (Right click → Send to back)
6. Group text + rectangle for easy moving
7. Download → PNG → 1080×1920

---

## QA Checklist לפני העלאה ל-Meta Ads

- [ ] טקסט ה-CTA קריא בקלות גם ב-thumbnail קטן (320×570 preview של Reels feed)
- [ ] ניגודיות מספקת בין הטקסט לרקע (test: לראות ב-grayscale — אם לא קריא, להגביר alpha)
- [ ] הטקסט בעברית בלבד; אין אנגלית מבולגנת
- [ ] אין חתיכים של טקסט נחתכים על ידי safe area
- [ ] CTA מסתיים בלי נקודה (או עם — לפי הגרסה למעלה)
- [ ] גרסה דחוסה (PNG ≤ 30MB) שעוברת ב-Meta Ads requirements

---

## גרסאות יצוא

לכל אחד מ-10 ה-CTAs, צור 3 גרסאות יצוא:

1. **PNG-static** (Feed, Stories, Reels cover) — 1080×1920
2. **MP4-loop-3sec** (Reels Ad slot) — 1080×1920, hold static עם CTA, 3 שניות, אופציונלי גם עם איזשהו subtle motion (zoom 2% פנימה)
3. **JPG-1080x1080** (Feed Square) — אם רוצים variant נוסף לפיד רגיל. המלצה: לא ב-A/B הראשון — זה יוסיף משתנה.

יצא ל-`publish/` עם שם:
```
publish/01_direct_download_static.png
publish/01_direct_download_3sec.mp4
```

---

## הערות חשובות לטסט

- **A/B נקי**: לא לשלב 2 שינויים בעת ובעונה אחת. אם מתחילים לבדוק overlay design (צבע/גודל) — זה טסט נפרד אחרי שזיהית CTA winner.
- **גודל טסט מינימלי**: כל CTA צריך לפחות 1,000 impressions לפני שמודדים. בקמפיין PSA ישראלי 22-28, זה ~$3-5 ליום ליחידה × 10 = $30-50 ליום מינימום.
- **נצחה**: CTA המנצח = הגבוה ביותר ב-CPI (לא ב-CTR). CTR גבוה ו-install נמוך = clickbait, לא רלוונטי.
- **שכפל ל-2 audiences** אם רוצים בו זמנית לבדוק audience: lookalike של creator-content-fans vs broad finance-curious. זה משתנה שני — בדוק רק אחרי A/B של CTA.
