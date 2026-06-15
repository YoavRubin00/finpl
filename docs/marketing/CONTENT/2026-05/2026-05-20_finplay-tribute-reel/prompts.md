# Prompts log — FinPlay Tribute Reel

## Higgsfield generations

**אין generations חדשים בסשן הזה.** ה-reel כולו מבוסס על קליפים קיימים מ-[2026-05-14_captain-shark-tel-aviv](../2026-05-14_captain-shark-tel-aviv/) — ראה [brief.md](brief.md) לרשימה.

### למקרה שהמשתמש ירצה phone UI hero shot (optional)

- **מודל**: Nano Banana 2 (image) → אופציונלי Kling 3.0 (image-to-video) להוסיף קצת motion
- **עלות**: ~3-5 credits (Nano Banana) או ~5-10 (אם גם וידאו)
- **Prompt טיוטה** (לא הורץ):

```
Hand holding a modern smartphone in vertical 9:16 frame, displaying a
gamified financial app interface. The screen shows an XP progress bar
near full, "Level 12" badge, a coin counter "1,250", a streak indicator
"7 days", and small character icons. Deep blue and cyan UI palette,
clean geometry, premium fintech aesthetic. Soft cinematic lighting,
slight bokeh background, Tel Aviv golden hour ambient color outside.
Photoreal hand and phone. NO TEXT visible should match real Hebrew —
keep UI labels abstract / placeholder.
```

> **למה לא הורץ**: ה-brand-kit מדגיש "הקפטן הוא ה-brand" — UI showcase מתאים יותר ל-CapCut overlay על הקליפים הקיימים. ראה [script.md](script.md) שניות 14-17 לפתרון ה-CapCut.

## Kinetic typography assets (ייצור ב-CapCut, לא ב-Higgsfield)

רשימת ה-text overlays שצריך ליצור ב-CapCut. כולם **Heebo** (Black/Bold/Light לפי הקונטקסט). ראה [script.md](script.md) לטיימינג ולסגנון.

| טקסט | פונט | גודל | צבע | timing |
|---|---|---|---|---|
| FinPlay (hook) | Heebo Black | 120px | white + cyan stroke | 0.5-1.5s |
| +50 XP × 4-5 | Heebo Bold | 60px | gold | 3.0-5.5s |
| מטבעות | Heebo Black | 100px | white | 4.3-5.2s |
| LEVEL 1/2/3/4 | Heebo Bold | 80px | white on gold | 5.5-8.0s |
| תל-אביב 🦈 | Heebo Bold | 70px | white | 8.5-10.5s |
| סטריק × N | Heebo Black | 80-150px | white→gold→red | 11.0-14.0s |
| +XP × 3-4 | Heebo Bold | 70px | gold | 17.0-18.5s |
| +1,000 XP | Heebo Black | 120px | gold | 18.5-20.0s |
| ACHIEVEMENT UNLOCKED | Heebo Black | 80px | white on gold band | 20.0-21.0s |
| הכסף לא צריך להיות מלחיץ. | Heebo Light | 60px | white | 21.5-24.0s |
| בוא נשחק קצת. | Heebo Bold | 80px | white | 25.0-27.5s |
| FinPlay (lockup) | Heebo Black | 200px | white | 28.0-30.0s |
| @finplay_ | Heebo Bold | 50px | cyan | 28.0-30.0s |

## ElevenLabs voiceover

**לא בשימוש**. Tribute reel מוזיקלי, ללא קריינות.

## Suno music (אם פעיל)

**Style prompt** (לפי [BRAND/prompt-library.md](../../../BRAND/prompt-library.md#suno--מוזיקה-כשנוסיף)):

```
indie pop, energetic, optimistic, female vocals optional,
hook at second 3, 110-120 BPM
```

**TODO**: לא הורץ. אם Suno MCP לא פעיל, להחליף ב-track מ-Epidemic Sound או Artlist.

## Pattern לעתיד

אם ה-reel הזה מצליח (>50 לייקים, לפי baseline ב-[BRAND/brand-kit.md](../../../BRAND/brand-kit.md)) — לתעד את ה-structure (hook → DNA × 2 → vibes → streak → UI moment → peak → outro → lockup) כ-template ב-[TEMPLATES/](../../../TEMPLATES/).
