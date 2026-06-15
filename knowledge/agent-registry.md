# 🗂️ agent-registry — מי-עושה-מה בצוות FinPlay

> מפת כל הסוכנים בפרויקט `finpl-current`: דמות, KPI יחיד, ידע שהוא טוען, ומתי לקרוא לו.
> מתוחזק על ידי **מאיה**. סוכן חדש/משופר נרשם כאן עם `version`.
> **תאריך עדכון:** 2026-06-15.

## שני סוגי סוכנים
1. **`.claude/agents/` — subagents** (נקראים דרך Task / `subagent_type`): yoatzon, בר, טרנדון, מושן, **maya**. אסטרטגיה, שיווק, טרנדים, מדיה, enablement.
2. **`.claude/commands/` — slash commands** (נקראים ב-`/שם`): וארן, יוצרון, יפיופי, מוני, רטנשן, דואו, אודרי, ארכיטקט, הסורק, קפטן. עובדים על **הקוד והמוצר**.

---

## סוכני `.claude/agents/`

| סוכן | תפקיד | KPI יחיד | ידע לטעון | model | version |
|---|---|---|---|---|---|
| **yoatzon** 🧠 | אסטרטגיה + Chief of Staff של יואב. אילוץ #1, מנופים ל-₪400K, סריקת Projects DB, דוח Notion + טלגרם | התקדמות ל-**₪400K** (revenue מצטבר) | INDEX, business-facts, glossary | opus | A |
| **בר** 📣 | CMO: גאנט תוכן, סושיאל אורגני (וואטסאפ+אינסטגרם), הפקת קפטן שארק ב-Higgsfield | **התקנות לפי `$source`** + activation מערוץ | INDEX, brand-voice (`docs/BRAND.md`), business-facts, glossary | opus | A |
| **טרנדון** 🔥 | חיישן טרנדים פיננסי יומי IL+עולם + 3 סקרים + רעיונות קפטן שארק | **רעיונות שנכנסים לגאנט** של בר (relevance×viral) | INDEX, glossary, brand-voice | sonnet | A |
| **מושן** 🎬 | Motion Design באפליקציה (Reanimated/Lottie, 60fps) + מדיה motion שיווקית | **60fps + game-feel** ללא jank | INDEX, brand-voice, business-facts | sonnet | A |
| **maya** 🎓 | ראש Enablement: מתחזקת את המוח, יוצרת/משפרת סוכנים, סורקת פערים | **איכות+עקביות הצוות** (כל סוכן עם דמות+KPI+knowledge) | INDEX + כל `knowledge/` | opus | A |

---

## סוכני `.claude/commands/` (slash על הקוד/מוצר)

| פקודה | שם | תפקיד | KPI יחיד | נוגע בקוד? |
|---|---|---|---|---|
| `/וארן` | וארן 📊 | דיוק פיננסי: מאמת מס/ריבית/נתונים בתוכן השיעורים | **0 נתונים שגויים** בתוכן | data files בלבד (אחרי אישור) |
| `/יוצרון` | יוצרון ✨ | יוצר תוכן חדש: שיעורים/קוויזים/דילמות/תרחישים (RTL, BRAND) | **תוכן חדש תקין** (tsc נקי, IDs ייחודיים) | מוסיף ל-data files |
| `/יפיופי` | יפיופי 🎨 | UX + Game-feel: RTL, נגישות (תקנה 5568/WCAG AA), Core Loop, juice | **Onboarding completion** + retention | כן (UI, לא לוגיקה כלכלית) |
| `/מוני` | מוני 💰 | כלכלת משחק: Sinks/Sources, מחירים, drop rates | **Sink/Source ratio** + conversion | כן (מספרי כלכלה) |
| `/רטנשן` | רטנשן 🔥 | LiveOps: אירועים, LTOs, push, retention curves | **D1/D7/D30 retention** | כן (notifications/events) |
| `/דואו` | דואו 🦉 | מנגנוני Duolingo מתורגמים (streak, hearts, league, notif) | **+X% על metric מוגדר** (hypothesis) | כן (mechanics) או PRD |
| `/אודרי` | אודרי 🌹 | טעם, אמון, איפוק: חותכת רעש, מגנה מ-AI-גנרי/קזינו/מונטיזציה מנצלת | **Save/Share/Trust** (לא volume) | copy/microcopy בלבד |
| `/ארכיטקט` | ארכיטקט 🏗️ | Refactoring, ביצועים, ארכיטקטורה, DB (Neon MCP) | **0 שגיאות tsc + 0 `any`** | כן (refactor בלבד) |
| `/הסורק` | הסורק 🐛 | ציד באגים, crashes, memory leaks, dead code | **0 שגיאות tsc** | כן (fix בלבד) |
| `/קפטן` | קפטן 🚀 | Release management: pre-flight, build, submit לחנויות | **build נקי + עולה לחנות** | configs (לא לוגיקה) |

> **חוק BRAND:** כל סוכן שכותב קופי פונה-משתמש (יוצרון, יפיופי, אודרי, בר, מושן, רטנשן) — קורא `docs/BRAND.md` קודם ([[brand-voice]]).

---

## מטריצת חפיפות — מי מטפל במה (לפי הגבולות שכל סוכן הצהיר)
| נושא | בעלים | לא — לעבור ל... |
|---|---|---|
| אסטרטגיה / ₪400K / אילוץ #1 | yoatzon | — |
| גאנט תוכן + סושיאל | בר | טרנדים גולמיים → טרנדון; תוכן באפליקציה → יוצרון |
| טרנדים יומיים | טרנדון | בחירה+תזמון → בר |
| Motion premium / מדיה שיווקית | מושן | game-feel design → יפיופי; השארק כגיבור → skill `finplay-higgsfield-reels` |
| תוכן באפליקציה (שיעורים/דילמות) | יוצרון | קופי refinement → אודרי; דיוק → וארן |
| UX / RTL / נגישות / Core Loop | יפיופי | קוד/ביצועים → ארכיטקט; כלכלה → מוני |
| כלכלה (מחירים/drop rates) | מוני | mechanic design → יפיופי; LTO timing → רטנשן |
| LiveOps / push / events | רטנשן | מחירים → מוני; copy refinement → אודרי |
| מנגנוני edtech (streak/league) | דואו | timing/cadence → רטנשן; juice → יפיופי |
| טעם / איפוק / trust | אודרי | פיצ'ר חדש → יפיופי; תוכן → יוצרון |
| קוד / refactor / DB | ארכיטקט | באגים → הסורק |
| באגים | הסורק | refactor → ארכיטקט |
| דיוק פיננסי בתוכן | וארן | — |
| Release | קפטן | — |

---

## ⚠️ חפיפות מול ה-OS וסטטוס סנכרון
- **yoatzon** קיים **גם** בפרויקט `yoav rubin OS` (`.agents/yoatzon.md`). העותק כאן הוא ה-subagent המקומי. **העותק כאן stale יותר** (מזכיר את "איתי" כפעיל, נתונים מסוף מאי). מקור-האמת לפרופיל יואב/צוות הוא ה-OS. ראה [[gaps]].
- **טרנדון** רץ כ-routine בענן (`trig_01HfFkRa9Yh7BzwjNbdQ9Vin`, 07:00 IL); הקובץ כאן הוא ה-on-demand subagent. תואם.
- **בר / מושן / 10 הפקודות** — ייחודיים לפרויקט `finpl-current` (לא קיימים ב-OS).
- **maya** — מותקנת כאן ע"י עצמה (2026-06-15) כראש Enablement של צוות FinPlay. version A.

## נוהל עדכון
סוכן חדש/משופר → ערוך את הקובץ ב-`.claude/agents/` או `.claude/commands/`, הוסף `knowledge:` ושורת "טען INDEX", רשום כאן עם `version`, ותעד ב-OS `audits/agent-evals/`.
