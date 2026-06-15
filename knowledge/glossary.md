# 📖 glossary — מילון FinPlay

> מילון מאוחד: אירועי PostHog, מזהים, תעריפי הגשר, מטבעות המשחק, והגדרות KPI.
> מקובץ מתוך `yoatzon.md` ו-commands. **מתוחזק על ידי מאיה.** נתון משתנה → עדכן כאן.
> **תאריך עדכון:** 2026-06-15.

## מקורות נתונים
| מקור | מזהה | תוכן |
|---|---|---|
| PostHog project | `176605` | KPIs, funnels, retention, session replays |
| PostHog dashboard | `672885` ("My App Dashboard") | 13 tiles, פרוס למעלה |
| Notion Daily Briefings | `fd6cc831-b83c-82dd-ae06-01652f08ee76` | עמוד הורה לדוחות יומיים |
| Notion Projects DB | `0bacc831-b83c-8208-bfa4-81998d85c7a9` | פרויקטים + משימות + יעדים |
| Notion Marketing Team | `341cc831-b83c-807e-9e14-c38fb9ef77c4` | teamspace שיווק (גאנט של בר) |
| פרויקט "משימות שיווק" | `364cc831-b83c-80aa-8c20-d7f560857a97` | תחת teamspace שיווק |
| Repo | `YoavRubin00/finpl` (master) | הקוד + ה-instrumentation |

## אירועי PostHog מרכזיים (KPIs)
| אירוע / מדד | משמעות |
|---|---|
| `Application Opened` (autocapture) | DAU |
| `Application Installed` | התקנות (breakdown לפי `$source`: tiktok/instagram/whatsapp/organic) |
| `user_signed_in` | התחברות (היה שבור 21–28/5, תוקן ב-`c60ed3a`) |
| `guest_converted_to_user` | אורח→משתמש רשום (תוקן ב-`c00cc65`) |
| `onboarding_started` → `onboarding_completed` | Onboarding Completion Rate |
| `bridge_viewed` → `bridge_benefit_tapped` → `bridge_redeem_confirmed` → `bridge_partner_url_opened` | משפך הגשר (breakdown לפי `category`) |
| `is_pro` (person property) | פילוח Pro vs Free |

**Insights ידועים:** Bridge Conversion Funnel `jQ26ffiM` · Onboarding Conversion Daily Trend `b1CjsUAH`.

## תעריפי הגשר (the-bridge) — נכון לסוף מאי 2026
> מקור הכנסה per-conversion. שלוף `bridge_partner_url_opened` עם breakdown לפי `partner_name`, וכפול בתעריף.
> ⚠️ **לאמת** — תעריפים יכולים להשתנות; בדוק מול יואב לפני חישוב מחזור.

| שותף | קטגוריה | ₪ לפעולה | `partner_name` ב-PostHog |
|---|---|---|---|
| אלטשולר שחם טרייד | investments | **₪500** | "אלטשולר שחם טרייד" |
| אינטראקטיב ישראל | investments | **₪750** | "אינטראקטיב ישראל" |
| Cover | insurance | **₪100** | "Cover" |

קטגוריות הגשר: investments / bank-accounts / insurance / credit-cards / education.
שותפים פעילים כיום: **3** (יעד: 8+).

## מטבעות המשחק (Economy)
| מטבע | סוג | תפקיד |
|---|---|---|
| **Coins** | soft | בשפע — תגמולי שיעור/קוויז/streak/quest. (מבנה: `src/features/economy/useEconomyStore.ts`) |
| **Gems** | hard | נדיר — נרכש בכסף אמיתי, refill של hearts, תוכן פרימיום |
| **XP** | progression | קידום, ליגות, אריינה |
| **Hearts** | pacing | 5 max, pacing של למידה (`src/features/subscription/useHeartsStore.ts`) |
| **Streak** | identity | רצף ימי למידה |

**IAP:** חבילות gems `finplay_gems_80` … `finplay_gems_14000` · Starter Pack `finplay_starter_pack_19_90`.
**Pro:** entitlement `FinPlay Pro` (RevenueCat), offering חודשי + שנתי.

## הגדרות KPI מרכזיות (לפי תפקיד)
| KPI | הגדרה | בעלים ראשי |
|---|---|---|
| install→paid conversion | רכישות / התקנות | yoatzon (אבחון), מוני (תמחור) |
| Onboarding Completion | `onboarding_completed / onboarding_started` | יפיופי, דואו |
| Guest→Registered | `guest_converted_to_user` | yoatzon |
| Pro upgrade rate | `subscription_purchased / onboarding_completed` | מוני |
| Bridge conversion | `bridge_partner_url_opened` × תעריף | yoatzon |
| Install by source | `Application Installed` breakdown `$source` | בר |
| D1/D7/D30 retention | week-over-week | רטנשן |
| Save/Share rate | תוכן נשמר/משותף | אודרי, בר |

## מונחים פנימיים
- **Core Loop** — לולאת הלמידה המרכזית (`DuoLearnScreen.tsx`, lesson flow).
- **הגשר / the-bridge** — מנגנון המרת מטבעות להטבות אמיתיות (מקור הכנסה + רגיש-אמון, ראה `/אודרי`).
- **קפטן שארק** — המסקוט. קולו מוגדר ב-`docs/BRAND.md` ([[brand-voice]]).
- **חכמת ההמונים** — פיצ'ר סקרי חיזוי/סנטימנט; בסיס לסקרי וואטסאפ של בר/טרנדון.
