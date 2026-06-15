# Prompt Library — FinPlay

> אוסף פרומפטים שעובדים — ויזואל, קריינות, קופי. כל פעם שמשהו יוצא טוב — להוסיף כאן.

---

## ElevenLabs — קריינות עברית

### הקול הראשי של המותג: **Liam**

```
Voice ID: TX3LPaxmHKxFdv7V0QHJ
Model:    eleven_v3
```

זה הקול שמשמש בסקריפטים של האפליקציה ([finpl/scripts/generate_module_audio.js](C:/Users/יואב רובין/.claude/projects/finpl/scripts/generate_module_audio.js)). שומר על עומק, סמכות, ואופי דיבור עקבי על פני כל המודולים.

### הגדרות מומלצות (התחלה)
- **stability**: 0.5 (ניטרלי) או 0.65 (עקבי יותר לקריינות מודולית)
- **similarity_boost**: 0.75
- **style**: 0.3-0.4 (טון מבוקר; גבוה מדי = דרמטי מדי)
- **use_speaker_boost**: true

### דוגמת קריאה ב-MCP

```
mcp__ElevenLabs__text_to_speech(
  text: "...",
  voice_id: "TX3LPaxmHKxFdv7V0QHJ",
  model_id: "eleven_v3",
  stability: 0.65,
  similarity_boost: 0.75,
  style: 0.35
)
```

### Tips לכתיבת סקריפט עברית
- **מספרים במילים**: "שלוש" במקום "3" (ב-eleven_v3 משופר אבל עדיין יציב יותר ככה)
- **פסיקים ופוינטים** = הפסקות. השתמש בקפידה.
- **אנגליציזמים** (Apple, Excel, TikTok) — ההגייה לא תמיד מושלמת. שקול לכתוב פונטית או להחליף בעברית.
- **דגימה קצרה לפני שיוצרים סקריפט מלא** — לבדוק שההגייה מקובלת.

### דוגמאות סגנון לקריינות לפי תוכן
- **למידה רגילה (מודול)**: stability 0.65, style 0.35 — מאוזן, סמכותי-נעים
- **Hook ברגש (פתיח של ריל)**: stability 0.4, style 0.6 — יותר אנרגטי
- **כתוביות סיכום (אאוטרו)**: stability 0.7, style 0.25 — רגוע, מסכם

---

## Higgsfield — תמונות לאפליקציה (Nano Banana / GPT Image)

### Style guide גלובלי לתמונות מודולים

```
A minimalist, flat vector illustration representing [CONCEPT]. 
Keep it completely text-free. 
Deep blue and cyan palette, clean geometry, negative space, 
premium fintech aesthetic, highly polished.
```

**5 רכיבים שאסור להחסיר**:
1. `minimalist, flat vector illustration` — לא 3D, לא ציור שמן
2. `completely text-free` או `no text whatsoever` — AI הוזה טקסט בעברית
3. `Deep blue and cyan palette` — קונסיסטנטיות מותג בכל המודולים
4. `clean geometry, negative space` — אסתטיקת fintech מודרנית
5. `premium fintech aesthetic` — לא clip-art

מקור מלא: [finpl/INFOGRAPHIC_RECIPE.md](C:/Users/יואב רובין/.claude/projects/finpl/INFOGRAPHIC_RECIPE.md)

---

## Higgsfield — תמונות לתוכן חברתי (פוסטים, ריילים)

### Style 1: Brand Educational (רגיל, חינוכי)
```
A minimalist flat vector illustration representing [CONCEPT].
Deep blue and cyan palette, clean geometry, negative space,
premium fintech aesthetic. Vertical 9:16 composition.
NO TEXT, NO LETTERS.
```

### Style 2: UGC Authentic (חי, גולמי)
```
Real-life photo of person using mobile finance app at [LOCATION:
coffee shop / office desk / bedroom evening]. Natural light,
casual outfit, slight motion blur, authentic Instagram aesthetic.
9:16 vertical.
```

### Style 3: Bullshit Swipe (לפרסומות שמלגלגות על הז'אנר)
לסגנונות "spam aesthetic" שלפעמים שימושיים לסטוריטלינג של "ככה זה נראה כשמנסים לרמות אותך":

ראה [finpl/NANO-BANANA-PROMPTS.md](C:/Users/יואב רובין/.claude/projects/finpl/NANO-BANANA-PROMPTS.md) — יש שם 12 templates של:
- Scam neon (ורוד-סגול ניאון)
- Crypto scam (כחול כהה + זהב)
- MLM aspirational (פסטל פייטה)
- Tech conspiracy (matrix dark)
- Real estate scam (בלו-אאוואר + מטבעות)

---

## Captain Shark — character prompts (Nano Banana / GPT Image)

> **הדמות הראשית של המותג**. כל פוסט עמוד 2 (חינוך) ו-3 (כאב/הומור) מציג אותה. עקביות = זיהוי מיידי בפיד.

### Base prompt (לכל וריאציה)

```
Cartoon shark mascot, friendly and charismatic, large expressive eyes,
warm and approachable smile (not menacing), Pixar-style 3D render,
deep blue and cyan body palette with light blue belly, soft rim lighting,
clean background or simple environment, premium polished finish.
NO TEXT, NO LETTERS in image.
9:16 vertical for Reels / 1:1 square for posts / 4:5 for carousels.
```

### וריאציות מצב

**שארק מבולבל (לפוסטי כאב/שאלה)**:
```
[base] + Shark with confused expression, head tilted, question marks
floating around (no text), holding a calculator or looking at phone screen.
```

**שארק מצליח (לפוסטי payoff)**:
```
[base] + Shark with confident smile, holding stack of money / golden coins
falling from above, slight excited gesture, light beam from above.
```

**שארק אמפתי (לפוסטי "הכאב שלך")**:
```
[base] + Shark with soft, understanding expression, gentle eyes,
arm extended forward (like offering hand / saying "I get it"),
muted soft lighting.
```

**שארק מסביר (לקרוסלות חינוכיות)**:
```
[base] + Shark in "teacher mode" — pointing to invisible whiteboard area
(where text/diagram will be added later in CapCut), engaged expression,
slight 3/4 angle.
```

**שארק שובב (לפוסטי הומור)**:
```
[base] + Shark with playful smirk, raised eyebrow, sneaky pose
(like sharing a secret), slightly leaning toward camera.
```

### חוקי ברזל לקפטן שארק

1. **אסור לוגו "FinPlay" בתמונה** — הדמות היא ה-brand reveal
2. **אסור טקסט בתוך התמונה** — כל caption נוסף ב-CapCut
3. **תמיד חיוך/הבעה ידידותית** — אף פעם מאיים, אף פעם זועף
4. **פלטה עקבית**: כחול-תכלת + צהוב לבטא בלבד
5. **רקע פשוט** — לא להעמיס. הדמות במרכז.
6. **בכל וריאציה — אותו ראש כריש**. אם יוצא שונה משמעותית, לאמן Soul ID.

---

## Higgsfield — וידאו (Cinema Studio MCSLA)

ראה [TEMPLATES/mcsla-recipes.md](../TEMPLATES/mcsla-recipes.md) למתכונים.

### דוגמה — Talking head מציג טיפ פיננסי
```
M: kling_3_0  ← ברירת מחדל
   (chained עם Soul reference_id אם יש Soul ID)
C: medium close-up, subtle push-in 4%, eye-level
S: presenter casual ב-30+, smartwatch ביד, חולצת cotton פשוטה
L: תאורת window key + soft fill, צבעים נטרליים, מרגיש
   "מקצועי אבל לא מסחרי"
A: מסתכל למצלמה, מחוות פנים טבעיות (ב-kling אין lip-sync —
   הוידאו "דמום"), מחוות יד מינימליות, חיוך קל בסוף
Voiceover: ElevenLabs Liam (TX3LPaxmHKxFdv7V0QHJ),
           track חיצוני, מורכב ב-CapCut
Captions: בעברית, on-screen, נוספים ב-CapCut (לא ב-Higgsfield)
Duration: 10s
```

> **מקרה לאישור**: אם רוצים lip-sync אמיתי בעברית (פנים שמדברות בסנכרון) — לבקש אישור מפורש לעבור ל-`seedance_2_0`.

### דוגמה — App showcase (UI on mobile)
```
M: kling_3_0  ← ברירת מחדל
C: locked top-down, יד מחזיקה טלפון
S: יד צעירה, גוון עור טבעי, האפליקציה FinPlay על המסך
   (UI מוקאפ — לא לבקש מהמודל לרנדר את ה-UI הספציפי, להעלות screenshot
   כ-reference)
L: תאורת חלון רכה, שולחן עץ ברקע, קצת bokeh
A: גלילה אטית במסך, תקריב על אזור עם תנועה,
   חיוך מתחת לפריים
Captions/UI text: לא ב-Higgsfield — מורכב ב-CapCut
Duration: 6s
```

---

## Marketing Studio — UGC modes לפי סוג תוכן

### Talking head — explainer
```
Avatar: <Soul ID של presenter קבוע>
Hook (3 שניות ראשונות): "[משפט hook חזק בעברית]"
Body: "[3-4 משפטים על הקונספט הפיננסי]"
CTA: "FinPlay בלינק בביו"
Mode: UGC > talking head
Voice: ElevenLabs Liam (TX3LPaxmHKxFdv7V0QHJ)
Length: 30s
```

### Demo / Walkthrough
```
Mode: UGC > tutorial
Show: smartphone screen recording של האפליקציה
Voiceover: ElevenLabs Liam מסביר מה רואים
Captions: עברית on-screen תמיד
Length: 30-45s
```

---

## Suno — מוזיקה (כשנוסיף)

### Style 1: Lo-fi chill (לרגעי לימוד באפליקציה / B-roll)
```
lo-fi hip hop, mellow, daytime, no vocals, 90 BPM
```

### Style 2: Upbeat learning (לפתיח/אאוטרו)
```
indie pop, energetic, optimistic, female vocals optional,
hook at second 3, 110-120 BPM
```

### Style 3: Tense gaming (לסצנות "החלטה גורלית" / Bullshit Swipe)
```
electronic synthwave, building tension, no vocals, 100 BPM,
sharp drop at second 8
```

---

## קופי — formulas שמתאימים ל-FinPlay

### Hook — Pattern 1: Question with bite
```
"אם בכל פעם שאתה רואה משכורת אתה חושב 'איך זה כבר הלך?' — תקרא את זה."
```

### Hook — Pattern 2: Confession
```
"שילמתי 10K לכלכלן והוא נתן לי טבלה שיכולתי להכין לבד ב-25 דקות."
```

### Hook — Pattern 3: Counter-intuitive
```
"להפסיק לחסוך זה הצעד הראשון לעשירות אמיתית. ובכן — לא בדיוק."
```

### Body — Pattern: Problem → Reframe → Action
```
[Problem] רוב האנשים חושבים שהבעיה היא הכנסה.
[Reframe] בפועל — הבעיה היא לא לדעת *לאן* הכסף הולך.
[Action] FinPlay מלמד אותך לראות. בלי שיחות פיננסים. במשחק.
```

### Hook — Pattern 4: **Actuality Hook + Action** ⭐ (הזוכה הגדול — 181 לייקים)

הנוסחה שניצחה ב-`@finplay_`. מבנה: **[אירוע אקטואלי] + [שאלה ישירה לקהל] + [רמז שיש פתרון]**.

```
[אירוע + מספרים]: "המענק נכנס. 1,250₪."
[שאלה ישירה]: "אז מה עושים איתו?"
[רמז לתועלת]: "3 אופציות שכולם מציעים, ואחת שאף אחד לא ידבר איתך עליה ↓"
```

**מתי להשתמש**: כשיש אירוע אקטואלי בישראל (מענק, חג, שינוי ריבית, חוק חדש, מועד מס).
**איפה זה עובד הכי טוב**: Reel + פרזנטור אנושי בשטח חיצוני (לא קפטן שארק).
**KPI יעד**: 50+ לייקים מינימום. שיא 150+.
**ראה תבנית מלאה**: [../TEMPLATES/actuality-reel.md](../TEMPLATES/actuality-reel.md)

---

## הערות והוראות

- **כל פעם שמייצר תוכן ל-FinPlay**, התחל בקריאת [BRAND/voice.md](voice.md) ו-[BRAND/brand-kit.md](brand-kit.md).
- **אם יוצא טוב — תוסיף לכאן** עם תיאור קצר של המקרה.
- **אם משהו לא עובד — תוסיף לתחתית בסקציית "מה לא עבד"** עם הסבר קצר.

---

## מה לא עבד (יומן)

> שמור פה כשלונות מנע. חוסך זמן בעתיד.
> מקור: [../ANALYTICS/instagram-baseline-2026-05.md](../ANALYTICS/instagram-baseline-2026-05.md)

### דפוסי כשלון מאומתים מאינסטגרם (2026-04 → 2026-05)

- **טיזרים גנריים** ("בקרוב 🦈", "משהו חדש מגיע") → 18-22 לייקים, **0 תגובות**.
  *לקח*: לעולם לא להעלות פוסט בלי ערך עכשיו. אסור "בקרוב".

- **פוסטים סטטיים ללא CTA חד** → < 20 לייקים, < 3 תגובות.
  *דוגמה*: "תכירו את קפטן שארק" (10 לייקים — הנמוך ביותר).
  *לקח*: כל פוסט חייב CTA ספציפי שהקהל יודע מה לעשות איתו.

- **מסרים מופשטים בלי דוגמה ספציפית** → engagement נמוך.
  *דוגמה*: "חושבים שאתם מבינים בכסף?" (17 לייקים).
  *לקח*: שאלה ספציפית עם מספרים > שאלה מופשטת.

- **חגים ללא זווית פיננסית חזקה** → ביצועים בינוניים.
  *דוגמה*: "תרבחו ותסעדו" (מימונה, 18/0).
  *לקח*: כל פוסט חג חייב לכלול זווית כלכלית מובהקת.

- **פאוזות ארוכות בין פרסומים** → אלגוריתם מעניש.
  *לקח*: גאנט יציב 4 פוסטים/שבוע, גם אם תוכן בינוני, עדיף על שבוע "מושלם" אחרי שבוע ריק.

- **כיתובים ארוכים מדי** → הקהל לא קורא.
  *הבחנה*: הריל הזוכה (181) היה עם 3 שורות + שאלה. כיתובים קצרים-חדים עובדים יותר.

### אסור לעולם
- ❌ "הצטרפו אלינו" (CTA כללי)
- ❌ "לינק בביו" בלי הקשר
- ❌ "בקרוב" / "משהו חדש"
- ❌ פתיחה עם "חברים יקרים..."
- ❌ "מהפכני" / "פתרון הוליסטי" / "סינרגיה" (ראה [voice.md](voice.md))

---

*עדכון אחרון: 2026-05-08 (הוספת קפטן שארק character prompts, נוסחת Actuality, מילוי "מה לא עבד" מנתוני אינסטגרם)*
