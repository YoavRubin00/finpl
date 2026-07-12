# 🗂️ agent-registry — מי-עושה-מה בצוות FinPlay

> מפת כל הסוכנים בפרויקט `finpl-current`: דמות, KPI יחיד, ידע שהוא טוען, ומתי לקרוא לו.
> מתוחזק על ידי **מאיה**. סוכן חדש/משופר נרשם כאן עם `version`.
> **תאריך עדכון:** 2026-07-03 (נוסף **קורי** — PM של הלמידה, כפוף לים).

## שני סוגי סוכנים
1. **`.claude/agents/` — subagents** (נקראים דרך Task / `subagent_type`): yoatzon, בר, טרנדון, מושן, **maya**, **ים**, **קורי**. אסטרטגיה, שיווק, טרנדים, מדיה, enablement, מוצר/PMF, מוצר/למידה.
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
| **ים** 🧭 | מנהל-מוצר (PM): אוחז במוצר, מקור-אמת למצב-מוצר, רודמאפ ל-PMF. **מנהל צוות-מוצר** — מאציל data→הוג, הרגל→דואו, UX→יפיופי; מתכלל עם בר (שותף) | התקדמות ל-**PMF** (אקטיבציה · רטנשן WAU/WoW+D1 · streak≥2 · NSM) | INDEX, business-facts, glossary, brand-voice (`docs/BRAND.md`), CLAUDE.md, דשבורדים PMF 763997 + Retention 747334 | opus | B |
| **קורי** 📚 | PM של **כל הלמידה** (כפוף לים): הבעלים של עמוד-הלמידה/מודולים/שיעורים/פנינים/topic-tree. מאציל תוכן→יוצרון; מתאם UX→יפיופי והרגל→דואו (דרך ים) | **עומק ההתקדמות בלמידה** — `chest_opened` unique לכל לומד + רצף בין-מודולי | INDEX, business-facts, glossary, brand-voice (`docs/BRAND.md`), CLAUDE.md, מקורות-הלמידה (DuoLearnScreen/LessonFlowScreen/pearls/PRDs), דשבורד PMF 763997 | opus | A |
| **מוכרון** 💼 | אלוף מכירות B2B (הכרעת יואב 12.7): שני פיפליינים — שותפי-הגשר (בנקים/בתי-השקעות/ביטוח/קורסים) + הטמעת-האפליקציה בגופים (משרד-החינוך/מעסיקים/צה"ל-משוחררים). Clay MCP לחיפוש+העשרה (fallback: WebSearch/firecrawl). **לעולם לא שולח פנייה בעצמו** — מכין, יואב שולח. אפס פברוק. גבולות: תוכן-אורגני=בר, אסטרטגיה=יועצון, תמחור=מוני | **לידים מוסמכים בפיפליין + התקדמות-שלב שבועית** (איש-קשר מאומת + התאמה מנומקת + טיוטה) | INDEX, business-facts, glossary, brand-voice (`docs/BRAND.md`), docs/finplay-schools-plan.md, docs/MONETIZATION-PLAN.md | opus | A |

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
| מצב-מוצר / רודמאפ / החלטות-מוצר / PMF | **ים** | אסטרטגיה עסקית כוללת → yoatzon; דומיין-הלמידה → קורי |
| ניהול צוות-המוצר (האצלה) | **ים** | הביצוע: data→הוג · הרגל→דואו · UX→יפיופי |
| דומיין הלמידה: עמוד-למידה/מודולים/שיעורים/פנינים/topic-tree | **קורי** (כפוף לים) | PMF כולל/תיעדוף-על → ים; תוכן בפועל → יוצרון; UX-למידה → יפיופי (דרך ים) |
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
- **yoatzon** קיים **גם** בפרויקט `yoav rubin OS` (`.agents/yoatzon.md`). העותק כאן הוא ה-subagent המקומי. **עובדת הצוות סונכרנה** (2026-06-15): מרקטינג = יואב + [[בר]] (איתי עזב). **נתוני ה-KPI עדיין stale** (סוף מאי) — שלוף חי מ-PostHog. מקור-האמת לפרופיל יואב/צוות הוא ה-OS.
- **טרנדון** רץ כ-routine בענן (`trig_01HfFkRa9Yh7BzwjNbdQ9Vin`, 07:00 IL); הקובץ כאן הוא ה-on-demand subagent. תואם.
- **בר / מושן / 10 הפקודות** — ייחודיים לפרויקט `finpl-current` (לא קיימים ב-OS).
- **maya** — מותקנת כאן ע"י עצמה (2026-06-15) כראש Enablement של צוות FinPlay. version A.
- **ים** — נוצר ע"י מאיה (2026-06-30) לבקשת יואב, כמנהל-המוצר (PM) של FinPlay. ייחודי ל-`finpl-current`. **צוות-המוצר שהוא מנהל:** הוג (data, כרגע **ראוטין-ענן בלבד — אין קובץ סוכן מקומי**, ראה [[gaps]] G6), דואו (`/דואו`, רטנשן/הרגל), יפיופי (`/יפיופי`, UX/חוויה). **בר** = שותף cross-functional, לא כפוף. מקביל אנושי: תומר (PM אנושי) — ים מתכלל ומזין, תומר/יואב מכריעים.
  - **version B (2026-06-30, מאיה — Enablement fix):** נצפה שים נתקע בעת הפעלת הסקילים דואו/יפיופי לפני כתיבת התוצר. שורש: ה-Skill tool מגודר-הרשאות, ולא היו allow-rules לסקילים האלה ב-`settings.local.json` → prompt-אישור שנתקע בריצה אוטונומית. **תוקן:** (1) הוספו allow-rules ל-`Skill(דואו/duo)`, `Skill(יפיופי/ux-polish)`, `Task(בר)`, `PostHog exec`, `Notion fetch/search/create/update` (מיזוג, לא דריסה); (2) נוסף `tools:` מפורש ל-frontmatter של ים (Skill, Task, PostHog, Notion, Read/Write/Edit, Bash, Web); (3) נוסף playbook "איך לכנס את הצוות" עם כלל fail-through — אם delegate נכשל, רושמים שורה וממשיכים, **התוצר תמיד נכתב**; (4) חוזקה שורת טעינת-הידע (INDEX→BRAND→CLAUDE→דשבורדים).
- **קורי** 📚 — נוצר ע"י מאיה (2026-07-03) לבקשת יואב, כ-PM של **דומיין הלמידה**, **כפוף ישירות לים**. ייחודי ל-`finpl-current`. version A. **המבנה:** ים = PM-על (PMF כולל); קורי = PM-דומיין (הלמידה) שמזין את ים. **ההאצלה הישירה של קורי:** יוצרון (תוכן). **תיאום דרך ים:** יפיופי (UX-למידה) ודואו (הרגל-בלמידה) — נשארים כפופים לים (single-manager), קורי מבריף וים מכריע תיעדוף. KPI: `chest_opened` unique (לא `lesson_started` — התנפח ×2.5, שבירה 2026-06-12). ⚠️ **פתוח להחלטת יואב:** `settings.local.json` — לוודא allow-rules ל-`Skill(יוצרון)` + `Task(ים)` שקורי צריך (כמו שנעשה לים ב-version B), אחרת ייתקע בהאצלה אוטונומית. **הרשאת Task(קורי)** — להוסיף למי שיפעיל אותו (ים/יואב).

## נוהל עדכון
סוכן חדש/משופר → ערוך את הקובץ ב-`.claude/agents/` או `.claude/commands/`, הוסף `knowledge:` ושורת "טען INDEX", רשום כאן עם `version`, ותעד ב-OS `audits/agent-evals/`.
