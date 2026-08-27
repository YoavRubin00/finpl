import type { Module } from '../chapter-1-content/types';

/**
 * mod-4-33 — מדד הפחד (VIX). Yoav 19.8.2026: "תכין פרק נוסף בהשקעות על מדד הפחד, VIX."
 * Arc follows Yoav's 7-slide reference carousel (same beats, our own words, nothing verbatim).
 *
 * Motion-only module (no infographics / intro audio / video hook asset / summary
 * card / meme card exist yet — add them here when produced). Wired into
 * chapter4Data.ts by the caller.
 *
 * Every figure below carries its source in a `//` comment for וארן to verify.
 *  [S1] https://cdn.cboe.com/api/global/us_indices/governance/Volatility_Index_Methodology_Cboe_Volatility_Index.pdf
 *       — launched 1993 (S&P 100 ATM options); 2003 update with Goldman Sachs → S&P 500 puts+calls over a wide
 *       strike range; 30-day expected volatility.
 *  [S2] https://www.macroption.com/vix-all-time-high/ — all-time high CLOSE 82.69 (16.3.2020); all-time INTRADAY
 *       high 89.53 (24.10.2008); highest 2008 close 80.86 (20.11.2008); 5.8.2024 intraday high 65.73 and
 *       close-to-close spike "+15.18 from 23.39 to 38.57" (7th largest ever).
 *  [S3] https://www.cnbc.com/2020/03/16/wall-streets-fear-gauge-hits-highest-level-ever.html — 82.69 record close.
 *  [S4] https://www.investing.com/academy/trading/vix-index-definition/ and
 *       https://referently.com/vix-explained-what-the-fear-gauge-actually-measures-how-to-read-it-and-why-it-mean-reverts/
 *       — bands: <20 calm, 20–30 elevated, >30 fear (>40 crisis); long-run average ≈19.5.
 *  [S5] https://www.macroption.com/vix-spx-same-direction/ — VIX & S&P 500 move the SAME way ~1 in 5 days (≈20%);
 *       https://www.macroption.com/vix-spx-correlation ~ -0.70 (pct changes) / -0.79 (point changes), 1990-2022 per macroption; own calc 2016-2026 = -0.71 (Waren 27.8)
 *  [S6] https://www.sifma.org/research/insights/the-vixs-wild-ride — VIX ≈14 mid-Feb 2020 → 82.69 on 16.3.2020.
 *       mod-4-27 (already in-app): S&P 500 −34% Feb→Mar 2020, new high Aug 2020.
 *  [S7] Cboe official daily history CSV https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv
 *       (downloaded 27.8.2026). 2024 CLOSES: 22.7=14.91 · 26.7=16.39 · 31.7=16.36 · 1.8=18.59 · 2.8=23.39 ·
 *       5.8=38.57 (HIGH 65.73) · 6.8=27.71 · 8.8=23.79 · 9.8=20.37 · 13.8=18.12 · 16.8=14.80.
 *  [S8] https://www.cnbc.com/2024/08/04/stock-market-today-live-updates.html — 5.8.2024: S&P 500 −3.0% to 5,186.33,
 *       worst day since Sept 2022; trigger = weak jobs report / recession fears.
 *  [S9] https://www.bis.org/publ/bisbull95.htm (BIS Bulletin 95, "Anatomy of the VIX spike in August 2024") — biggest
 *       one-day spike ever, +180% to ~66 pre-market; https://www.bis.org/publ/bisbull90.pdf — the yen carry-trade
 *       unwind (BoJ hike 31.7.2024) behind the turbulence.
 * [S10] https://www.cboe.com/insights/posts/index-insights-august-2024/ — VIX back to "a 15 handle by mid-month";
 *       S&P 500 finished August at 5,648.40, ~0.3% below the July record.
 * [S11] https://www.cnbc.com/2024/09/18/stock-market-today-live-updates.html and
 *       https://en.wikipedia.org/wiki/Closing_milestones_of_the_S&P_500 — S&P 500 record close 5,713.64 on 19.9.2024.
 * [S12] https://www.schaeffersresearch.com/content/news/2015/02/09/how-time-decay-affects-the-value-of-vxx — VXX roll
 *       decay in contango ≈ −59%/yr; https://volatilitybox.com/research/vix-etfs-explained/ — long-vol ETPs lose
 *       60–80%/yr; contango is the state >80% of the time.
 * [S13] https://www.cnn.com/markets/fear-and-greed — 7 equal-weight inputs; "Market Volatility" = VIX vs its 50-day MA.
 * [S14] https://www.sponser.co.il/Article.aspx?ArticleId=97206 and https://protocol.co.il/vta35-index/ — TASE started
 *       publishing VTA35 on 15.7.2019 (implied vol of TA-35 options, 30 days ahead); "מדד הפחד" הישראלי.
 */
export const MOD_4_33_VIX: Module = {
  id: 'mod-4-33',
  // Added 19.8.2026 — after many users already finished chapter 4. bonusModule
  // keeps it fully playable (chest, XP, coins) WITHOUT re-locking chapter 5 for
  // them: every chapter-progression gate treats bonus modules like comingSoon.
  bonusModule: true,
  title: 'מדד הפחד — VIX',
  videoHook:
    'הבורסה אדומה, הכותרות צועקות "קריסה", וחבר שולח לי: "ה-VIX ב-45!!". מה זה בכלל אומר, ולמה כולם בפאניקה?',
  interactiveIntro:
    'לשוק יש מד חום: ה-VIX, "מדד הפחד" של וול סטריט. נבין מה הוא באמת מודד, איך הוא מחושב, מה הוא לא יודע להגיד — ולמה דווקא כשהוא מזנק, משקיע לטווח ארוך צריך לנשום עמוק לפני שהוא מוכר.',
  interModuleGame: 'crash',
  flashcards: [
    {
      id: 'fc-4-33-1',
      text: 'מה זה בכלל VIX? "מדד הפחד" מודד את רמת התנודתיות שהשוק מתמחר ל-30 הימים הקרובים ב-‎S&P‎ 500. במילים פשוטות: הוא לא מודד מה כבר קרה, אלא למה שוק האופציות מצפה. את המדד מפרסמת בורסת CBOE בשיקגו מאז 1993.',
      segments: [
        {
          text: '**מה זה בכלל VIX?** [[VIX]], "מדד הפחד", מודד את רמת ה[[תנודתיות]] שהשוק מתמחר ל-30 הימים הקרובים ב-[[S&P 500|‎S&P‎ 500]].',
          visual: {
            kind: 'timeline',
            milestones: [
              { label: '1993', sublabel: 'CBOE משיקה את ה-VIX' }, // [S1]
              { label: '2003', sublabel: 'שיטה חדשה: אופציות ‎S&P‎ 500' }, // [S1]
              { label: 'היום', sublabel: '"מדד הפחד" של העולם' },
            ],
            caption: 'יותר מ-30 שנה שהשוק מודד את הפחד של עצמו',
          },
        },
        {
          text: 'במילים פשוטות: הוא לא מודד מה כבר קרה — אלא למה שוק האופציות **מצפה**. מבט קדימה, לא במראה האחורית.',
        },
      ],
    },
    {
      id: 'fc-4-33-2',
      text: 'מנגנון התמחור: ה-VIX מחושב ממחירי האופציות על ‎S&P‎ 500, גם Put וגם Call. כשמשקיעים מוכנים לשלם יותר על אופציות, כי יש אי-ודאות והם רוצים להגן על התיק, מחירי האופציות עולים, וה-VIX עולה איתם. מה מדליק את זה? אירועי מאקרו, חשש מריבית, נתוני אינפלציה חריגים, משברים פיננסיים, אירועים גיאופוליטיים או נפילה חדה במניות.',
      segments: [
        {
          text: '**מנגנון התמחור**: ה-VIX מחושב ממחירי האופציות על ‎S&P‎ 500 — גם Put וגם Call. כשמשקיעים מוכנים לשלם יותר על [[גידור|הגנה]] לתיק, מחירי האופציות עולים, וה-VIX עולה איתם.', // [S1]
          visual: {
            kind: 'timeline',
            milestones: [
              { label: 'אי-ודאות', sublabel: 'משהו בחדשות מפחיד' },
              { label: 'ביקוש להגנה', sublabel: 'כולם רוצים ביטוח לתיק' },
              { label: 'האופציות מתייקרות', sublabel: 'משלמים יותר על Put ו-Call' },
              { label: 'ה-VIX מזנק', sublabel: 'מדד הפחד עולה' },
            ],
            caption: 'השרשרת שמזיזה את מדד הפחד',
          },
        },
        {
          text: 'מה מדליק את השרשרת? אירועי מאקרו, חשש מריבית, נתוני אינפלציה חריגים, משברים פיננסיים, אירועים גיאופוליטיים — או פשוט **נפילה חדה** במניות.',
        },
      ],
    },
    {
      id: 'fc-4-33-3',
      text: 'חשוב להבין: VIX גבוה לא אומר שהשוק בטוח ימשיך לרדת, ו-VIX נמוך לא אומר שאין סיכון. המדד לא מנבא כיוון, רק את רמת התנודתיות שמתומחרת. בגדול: מתחת ל-20 סביבה רגועה, מעל 20 יותר תנודתיות ואי-ודאות, ורמות גבוהות מאוד, כמו במשברים הגדולים, מסמנות לחץ משמעותי. השיאים: סגירה של 80.86 בנובמבר 2008 ו-82.69 ב-16 במרץ 2020.',
      segments: [
        {
          text: '**חשוב להבין**: VIX גבוה לא אומר שהשוק בטוח ימשיך לרדת, ו-VIX נמוך לא אומר שאין סיכון. המדד לא מנבא כיוון — רק את רמת התנודתיות שמתומחרת.',
        },
        {
          text: 'בגדול: מתחת ל-20 — סביבה רגועה. מעל 20 — יותר תנודתיות ואי-ודאות. רמות **גבוהות מאוד**, כמו במשברים הגדולים, מסמנות לחץ משמעותי.',
          visual: {
            kind: 'compare-bars',
            items: [
              { label: 'סביבה רגועה', value: 20, valueLabel: 'עד 20' }, // [S4]
              { label: 'אי-ודאות', value: 30, valueLabel: '20-30' }, // [S4]
              { label: 'נובמבר 2008', value: 80.86, valueLabel: '80.86' }, // [S2] close 20.11.2008 (intraday 89.53 on 24.10.2008)
              { label: 'מרץ 2020', value: 82.69, valueLabel: '82.69' }, // [S2][S3] close 16.3.2020, all-time high close
            ],
            caption: 'הממוצע ההיסטורי של ה-VIX: בערך 19-20', // [S4] ≈19.5
          },
        },
      ],
      finnTip: 'ה-VIX אומר כמה השוק לחוץ — לא לאן הוא הולך. מי שמחפש בו כיוון, טועה לשני הכיוונים.',
    },
    {
      id: 'fc-4-33-4',
      text: 'מה זה אומר למשקיעים? זינוק חד ב-VIX אומר שהשוק נסחר מתוך פחד, לחץ ואי-ודאות. הרבה משקיעים נלחצים ומוכרים דווקא לתוך הירידה. אבל היסטורית, תקופות של פחד גבוה היו לא פעם גם הזדמנויות מעניינות, למי שפעל במשמעת, הבין את החברות שהוא מחזיק, ולא החליט מתוך פאניקה. לא מובטח, אבל קרה יותר מפעם אחת.',
      segments: [
        {
          text: '**מה זה אומר למשקיעים?** זינוק חד ב-VIX = השוק נסחר מתוך פחד, לחץ ואי-ודאות. הרבה משקיעים נלחצים ומוכרים דווקא לתוך הירידה.',
        },
        {
          text: 'אבל היסטורית, תקופות של פחד גבוה היו **לא פעם** גם הזדמנויות מעניינות — למי שפעל במשמעת, הבין את החברות שהוא מחזיק, ולא החליט מתוך פאניקה. לא מובטח, אבל קרה יותר מפעם אחת.',
          visual: {
            kind: 'timeline',
            milestones: [
              { label: 'פברואר 2020', sublabel: 'VIX סביב 14' }, // [S6]
              { label: '16 במרץ 2020', sublabel: 'VIX 82.69 — שיא הסגירה של כל הזמנים' }, // [S2][S3]
              { label: 'אוגוסט 2020', sublabel: '‎S&P‎ 500 בשיא חדש' }, // [S6] mod-4-27
            ],
            caption: 'שיא הפחד — וחמישה חודשים אחר כך, שיא חדש במדד',
          },
        },
      ],
    },
    {
      id: 'fc-4-33-5',
      text: 'דוגמה בולטת: אוגוסט 2024. ב-5 באוגוסט ה-VIX זינק בצורה חריגה: בתוך יום המסחר נגע ב-65.7 וסגר על 38.6, שבועיים אחרי שהיה סביב 15. מאחורי הקלעים: פירוק מהיר של "עסקאות הין" היפניות וחשש מהאטה בארה"ב. ה-‎S&P‎ 500 ירד באותו יום 3%, תוך כשבועיים ה-VIX חזר ל-15 והמדד השלים את ההפסד, ובספטמבר כבר נקבע שיא חדש. הלקח: גם כשהשוק נראה רגוע, התנודתיות יכולה לחזור מהר מאוד.',
      segments: [
        {
          text: '**דוגמה בולטת: אוגוסט 2024.** ב-5 באוגוסט ה-VIX זינק בצורה חריגה: בתוך יום המסחר נגע ב-65.7 וסגר על 38.6 — שבועיים אחרי שהיה סביב 15.', // [S7] high 65.73, close 38.57; 22.7.2024 close 14.91
          visual: {
            kind: 'grow-line',
            // [S7] Cboe closes: 22.7, 26.7, 31.7, 1.8, 2.8, 5.8, 6.8, 8.8, 9.8, 13.8, 16.8.2024
            points: [14.91, 16.39, 16.36, 18.59, 23.39, 38.57, 27.71, 23.79, 20.37, 18.12, 14.8],
            caption: 'סגירות ה-VIX, 22 ביולי עד 16 באוגוסט 2024: מ-15 ל-38.6 — וחזרה ל-15',
          },
        },
        {
          text: 'מאחורי הקלעים: פירוק מהיר של "עסקאות הין" היפניות וחשש מהאטה בארה"ב. ה-‎S&P‎ 500 ירד באותו יום 3% — ותוך כשבועיים ה-VIX חזר ל-15 והמדד השלים את ההפסד. בספטמבר כבר **שיא חדש**.', // [S8][S9][S10][S11]
        },
        {
          text: 'הלקח: גם כשהשוק נראה רגוע לגמרי, **התנודתיות יכולה לחזור** מהר מאוד. ומי שנבהל ומכר ב-5 באוגוסט — פספס את החזרה.',
        },
      ],
    },
    {
      id: 'fc-4-33-6',
      text: 'עבור המשקיעים, הערך של ה-VIX הוא לא בניסיון לתזמן אותו: כמעט בלתי אפשרי לדעת מתי הוא יעלה או יירד. השימוש האמיתי: אינדיקטור למצב הרוח של השוק, מד חום של ההמון. ועוד משהו: אי אפשר לקנות את ה-VIX עצמו, ומוצרים שעוקבים אחריו מאבדים ערך לאורך זמן. לרוב האנשים זה לא צעצוע.',
      segments: [
        {
          text: '**עבור המשקיעים**, הערך של ה-VIX הוא לא בניסיון לתזמן אותו — כמעט בלתי אפשרי לדעת מתי הוא יעלה או יירד. השימוש האמיתי: מד חום למצב הרוח של ההמון.',
          visual: {
            kind: 'compare-bars',
            items: [
              { label: 'ימים שבהם ה-VIX והמדד זזים הפוך', value: 80, valueLabel: '~80%' }, // [S5]
              { label: 'ימים שבהם הם זזים יחד', value: 20, valueLabel: '~20%' }, // [S5]
            ],
            caption: 'מאז 1990: ה-VIX הוא כמעט מראה הפוכה של ה-‎S&P‎ 500',
          },
        },
        {
          text: 'ועוד משהו: אי אפשר לקנות את ה-VIX עצמו. מוצרים שעוקבים אחריו (כמו VXX) **מאבדים ערך** לאורך זמן בגלל עלות גלגול החוזים. לרוב האנשים זה לא צעצוע.', // [S12]
        },
      ],
      finnTip: 'ה-VIX הוא אחד מ-7 המרכיבים של מדד הפחד והחמדנות שפגשת בפרק 3. ולתל אביב יש גרסה משלה — VTA35, מאז 2019.', // [S13][S14]
    },
    {
      id: 'fc-4-33-7',
      text: 'לסיכום: ה-VIX הוא כלי חשוב להבנת הסביבה שבה אנחנו פועלים. הוא לא תחליף לניתוח של חברה, לא תחליף להבנת המאקרו, ולא כלי קסם לתזמון. אבל הוא עוזר להבין אם השוק רגוע, לחוץ, או בתקופה שבה התנודתיות שולטת בהחלטות. ומה שנותן ביטחון בים כזה הוא לא תחושת בטן: ידע, הבנה וסבלנות.',
      segments: [
        {
          text: '**לסיכום**: ה-VIX הוא כלי חשוב להבנת הסביבה שבה אנחנו פועלים. הוא לא תחליף לניתוח של חברה, לא תחליף להבנת המאקרו — ולא כלי קסם לתזמון.',
          visual: {
            kind: 'timeline',
            milestones: [
              { label: 'מים שקטים', sublabel: 'VIX מתחת ל-20' }, // [S4]
              { label: 'לחץ', sublabel: 'VIX בין 20 ל-30' }, // [S4]
              { label: 'התנודתיות שולטת', sublabel: 'VIX מעל 30' }, // [S4]
            ],
            caption: 'שלושה מצבי שוק — וה-VIX אומר באיזה מהם אנחנו',
          },
        },
        {
          text: 'אבל הוא עוזר להבין אם השוק רגוע, לחוץ, או בתקופה שבה **התנודתיות שולטת** בהחלטות. ומה שנותן ביטחון בים כזה הוא לא תחושת בטן — אלא ידע, הבנה וסבלנות.',
        },
      ],
      finnTip: 'בים סוער הבטן צועקת, והידע לוחש. ביטחון אמיתי בא מהבנה וסבלנות — לא מתחושת בטן. ככה מחזיקים את ההגה גם כשה-VIX ב-40.',
    },
  ],
  quizzes: [
    {
      id: 'q-4-33-1',
      question: 'מה ה-VIX מודד?',
      options: [
        'כמה ה-‎S&P‎ 500 ירד בחודש שעבר',
        'את רמת התנודתיות שהשוק מתמחר ל-30 הימים הקרובים, לפי מחירי אופציות',
        'את מספר המניות שירדו היום בבורסה',
        'את הריבית שהבנק המרכזי בארה"ב יקבע',
      ],
      correctAnswer: 1,
      successFeedback:
        'נכון. ה-VIX מסתכל קדימה, לא אחורה: הוא נגזר ממחירי אופציות Put ו-Call על ה-‎S&P‎ 500 ומשקף כמה תנודתיות השוק מצפה לה ב-30 הימים הקרובים.',
      failFeedback:
        'שגוי. ה-VIX לא מודד עבר ולא ריבית. הוא מחושב ממחירי אופציות ומשקף את התנודתיות שהשוק מתמחר ל-30 הימים הקרובים.',
      type: 'multiple-choice',
      conceptTag: 'vix',
    },
    {
      id: 'q-4-33-2',
      question: 'ה-VIX קפץ ל-35. מה נכון להגיד?',
      options: [
        'השוק בטוח ימשיך לרדת בשבועות הקרובים',
        'השוק מתמחר הרבה תנודתיות, אבל ה-VIX לא אומר לאיזה כיוון',
        'זו רמה רגועה, מתחת לממוצע ההיסטורי',
        'המדד מבטיח עלייה חדה כבר מחר',
      ],
      correctAnswer: 1,
      successFeedback:
        'נכון. ה-VIX מודד את רמת התנודתיות שמתומחרת, לא את הכיוון. 35 = לחץ משמעותי, אבל אף אחד לא יודע מזה אם מחר אדום או ירוק.',
      failFeedback:
        'שגוי. VIX גבוה לא מנבא ירידה, וגם לא עלייה. הוא אומר רק שהשוק מתמחר הרבה תנודתיות. 35 זה הרבה מעל הממוצע של בערך 19-20.',
      type: 'multiple-choice',
      conceptTag: 'vix',
    },
    {
      id: 'q-4-33-3',
      question:
        'יולי 2024: ה-VIX סביב 15, הכול רגוע. שבועיים אחר כך הוא נוגע ב-65 בתוך יום אחד. מה הלקח?',
      options: [
        'VIX נמוך מבטיח שקט לחודשים קדימה',
        'גם כשהשוק נראה רגוע, התנודתיות יכולה לחזור מהר, לכן התוכנית נבנית מראש',
        'צריך למכור הכול בכל פעם שה-VIX עולה מעל 20',
        'זינוק כזה לא אפשרי, כנראה תקלה במדד',
      ],
      correctAnswer: 1,
      successFeedback:
        'נכון. ב-5 באוגוסט 2024 ה-VIX נגע ב-65.7 אחרי שבועיים של שקט, ותוך שבועיים חזר ל-15. מי שבנה תוכנית מראש לא היה צריך להחליט בפאניקה.',
      failFeedback:
        'שגוי. VIX נמוך לא מבטיח כלום. באוגוסט 2024 הוא קפץ מ-15 ל-65.7 תוך שבועיים — רוב הדרך ביום אחד, והשוק השלים את ההפסד תוך שבועות. הלקח: תוכנית מראש, לא תגובה בפאניקה.',
      type: 'scenario',
      conceptTag: 'vix',
    },
    {
      id: 'q-4-33-4',
      question:
        'ה-VIX ב-45, הכותרות אדומות, ובקבוצת הוואטסאפ כולם מוכרים. מה עושה משקיע לטווח ארוך?',
      options: [
        'מוכר הכול ומחכה שה-VIX יירד מתחת ל-20 כדי לחזור לשוק',
        'לא מחליט מתוך פאניקה: בודק שהוא מבין מה הוא מחזיק, ונשאר עם התוכנית',
        'קונה מוצר שעוקב אחרי ה-VIX, כי "הפחד עולה"',
        'מעביר את כל התיק למזומן עד שיהיה שקט בחדשות',
      ],
      correctAnswer: 1,
      successFeedback:
        'נכון. VIX גבוה הוא מד חום, לא איתות למכור. היסטורית, תקופות של פחד גבוה היו לא פעם דווקא הזדמנות למי שפעל במשמעת ולא בפאניקה.',
      failFeedback:
        'שגוי. מכירה לתוך הירידה כשה-VIX בשיא היא הטעות הקלאסית. הפחד זמני, ההפסד שנועלים קבוע. משקיע לטווח ארוך נשאר עם התוכנית.',
      type: 'scenario',
      conceptTag: 'vix',
    },
    {
      id: 'q-4-33-5',
      question:
        'חבר מציע: "נקנה VIX כשהוא נמוך ונמכור כשהוא קופץ". מה הבעיה?',
      options: [
        'אין בעיה, זו דרך בטוחה להרוויח',
        'אי אפשר לקנות את ה-VIX עצמו, מוצרים שעוקבים אחריו מאבדים ערך, והתזמון כמעט בלתי אפשרי',
        'VIX נמוך אומר שהשוק בטוח יתרסק מחר',
        'צריך לחכות שה-VIX יגיע לאפס לפני שקונים',
      ],
      correctAnswer: 1,
      successFeedback:
        'נכון. ה-VIX הוא מספר, לא נכס. מוצרים כמו VXX מאבדים ערך לאורך זמן בגלל גלגול החוזים, ואף אחד לא יודע מתי הזינוק הבא. לרוב האנשים זה לא צעצוע.',
      failFeedback:
        'שגוי. אין "מניית VIX". מה שיש זה מוצרים על חוזים עתידיים שמדממים ערך רוב הזמן, וגם VIX נמוך לא מנבא קריסה. הערך של המדד הוא במד החום, לא בתזמון.',
      type: 'multiple-choice',
      conceptTag: 'vix',
    },
  ],
  simConcept: {
    id: 'sim-4-33',
    title: 'מד החום של השוק',
    description:
      'המשתמש רואה את ה-VIX מטפס בזמן אמת על רקע כותרות אדומות ומחליט בכל שלב: למכור, להחזיק או להמשיך להפקיד. בסוף משווים את התוצאה ל"אסטרטגיית הישיבה".',
  },
};
