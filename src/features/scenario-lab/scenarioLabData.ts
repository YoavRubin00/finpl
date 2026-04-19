import type { Scenario } from './scenarioLabTypes';

export const STARTING_CAPITAL = 100_000;

export const SCENARIOS: Scenario[] = [
  // ── 1. בועת הדוט-קום, 2000 ──
  {
    id: 'dotcom_bubble',
    title: 'בועת הדוט-קום מתפוצצת',
    emoji: '💥',
    color: '#7c3aed',
    difficulty: 2,
    year: 2000,
    briefing:
      'שנת 2000. חברות אינטרנט בלי הכנסות נסחרות במכפילים מטורפים. NASDAQ עלה 400% ב-5 שנים. אבל ב-מרץ 2000 הבועה מתפוצצת. יש לך 100,000 ₪, איך תשרוד?',
    sectors: [
      { id: 'tech', name: 'דוט-קום', emoji: '💻', color: '#7c3aed', description: 'מניות אינטרנט, Pets.com, WebVan, eToys', scenarioMultiplier: 0.22 },
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, נכס מקלט שעולה בזמני משבר', scenarioMultiplier: 0.96 },
      { id: 'bonds', name: 'אג"ח ממשלתי', emoji: '🏦', color: '#3b82f6', description: 'אג"ח ממשל ארה"ב, הנכס הבטוח ביותר', scenarioMultiplier: 1.18 },
      { id: 'value', name: 'מניות ערך', emoji: '🏭', color: '#6b7280', description: 'חברות ותיקות עם רווחים אמיתיים, P&G, J&J', scenarioMultiplier: 1.05 },
    ],
    events: [
      { month: 1, headline: '📈 NASDAQ בשיא כל הזמנים, 5,048 נקודות (מרץ 2000)', marketImpact: 1.0 },
      { month: 2, headline: '📉 מניית Cisco צונחת 20%, סדק ראשון בבועה', marketImpact: 0.85 },
      { month: 3, headline: '💀 Pets.com נסגרת, שרפה $300M תוך שנתיים', marketImpact: 0.72 },
      { month: 5, headline: '📉 NASDAQ ירד 40% מהשיא, פאניקה בוול סטריט', marketImpact: 0.60 },
      { month: 7, headline: '🏦 משקיעים בורחים לאג"ח, "עוד אף פעם מניות טק"', marketImpact: 0.48 },
      { month: 9, headline: '💼 100,000 פיטורים בסיליקון ואלי תוך חצי שנה', marketImpact: 0.38 },
      { month: 11, headline: '📊 רק 50 מתוך 300 חברות הדוט-קום שרדו', marketImpact: 0.30 },
      { month: 12, headline: '📉 NASDAQ ירד 78% מהשיא, ייקח עד 2015 להתאושש', marketImpact: 0.22 },
    ],
    marketBenchmark: 0.22,
    lessonTitle: 'מכפילים ללא רווחים = בועה',
    lessonText:
      'בועת הדוט-קום לימדה שחברות בלי הכנסות ובלי מודל עסקי אמיתי נמחקות. מניות ערך ואג"ח ממשלתי שמרו על ערך בזמן הקריסה.',
    historicalNote: 'NASDAQ צנח 78% מהשיא ולקח 15 שנה לחזור לרמות של מרץ 2000. חברות כמו Amazon ירדו 93% אבל שרדו ופרחו, רוב האחרות נעלמו.',
  },

  // ── 2. מלחמת יום כיפור ואמברגו הנפט, 1973 ──
  {
    id: 'yom_kippur_oil',
    title: 'אמברגו הנפט של 1973',
    emoji: '⛽',
    color: '#dc2626',
    difficulty: 2,
    year: 1973,
    briefing:
      'אוקטובר 1973. מלחמת יום כיפור פורצת. מדינות OPEC מטילות אמברגו נפט על מדינות שתומכות בישראל. מחיר הנפט קופץ פי 4 תוך חודשים. 100,000 ₪ בידיים שלך.',
    sectors: [
      { id: 'energy', name: 'נפט ואנרגיה', emoji: '⛽', color: '#f97316', description: 'חברות נפט, Exxon, Shell, BP', scenarioMultiplier: 1.70 },
      { id: 'defense', name: 'תעשייה ביטחונית', emoji: '🛡️', color: '#6b7280', description: 'חברות נשק, Lockheed, Raytheon', scenarioMultiplier: 1.25 },
      { id: 'stocks', name: 'S&P 500', emoji: '📊', color: '#7c3aed', description: 'מדד המניות הרחב של ארה"ב', scenarioMultiplier: 0.52 },
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, מגן על ערך הכסף בזמני אינפלציה', scenarioMultiplier: 1.65 },
    ],
    events: [
      { month: 1, headline: '⚔️ 6 באוקטובר, מלחמת יום כיפור פורצת', marketImpact: 0.92 },
      { month: 2, headline: '⛽ OPEC מכריזה על אמברגו נפט, מחיר חבית מ-$3 ל-$5', marketImpact: 0.82 },
      { month: 3, headline: '⛽ מחיר הנפט מזנק ל-$12, פי 4 מלפני המלחמה!', marketImpact: 0.72 },
      { month: 5, headline: '📉 שוקי המניות בעולם קורסים, תחילת מיתון', marketImpact: 0.62 },
      { month: 6, headline: '🥇 מחיר הזהב קופץ 70%, אינפלציה פוגעת', marketImpact: 0.58 },
      { month: 8, headline: '🚗 תורים לתחנות דלק בארה"ב, הרכב עומד', marketImpact: 0.55 },
      { month: 10, headline: '📊 S&P 500 ירד 48% מהשיא, Bear Market קשה', marketImpact: 0.52 },
      { month: 12, headline: '⛽ אמברגו הנפט מסתיים, אבל הנזק כבר נעשה', marketImpact: 0.52 },
    ],
    marketBenchmark: 0.52,
    lessonTitle: 'אנרגיה = כוח גיאו-פוליטי',
    lessonText:
      'משבר הנפט של 1973 הראה שאנרגיה היא כלי נשק כלכלי. נפט וזהב עלו בחדות, בעוד שוקי המניות קרסו. אינפלציה דהרה ל-12% בארה"ב.',
    historicalNote: 'S&P 500 ירד 48% ב-1973-74, הנפט עלה פי 4, והזהב זינק 65%. האינפלציה בארה"ב הגיעה ל-12.3%. המשבר שינה את כללי המשחק של הכלכלה העולמית.',
  },

  // ── 3. ההרחבה הכמותית (QE) אחרי 2008, 2009 ──
  {
    id: 'qe_2009',
    title: 'הרחבה כמותית, QE',
    emoji: '🖨️',
    color: '#16a34a',
    difficulty: 1,
    year: 2009,
    briefing:
      'מרץ 2009. הFed מדפיס $1.75 טריליון ומזריק לשווקים. ריבית 0%. המטרה: להציל את הכלכלה. 100,000 ₪ בידיים שלך, לאן הכסף הזול יזרום?',
    sectors: [
      { id: 'stocks', name: 'S&P 500', emoji: '📊', color: '#22c55e', description: 'מדד המניות, נהנה מכסף זול', scenarioMultiplier: 1.65 },
      { id: 'real_estate', name: 'נדל"ן', emoji: '🏠', color: '#7c3aed', description: 'נדל"ן, ריבית 0% = משכנתאות זולות', scenarioMultiplier: 1.28 },
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, מגן מפני אינפלציה מהדפסת כסף', scenarioMultiplier: 1.55 },
      { id: 'bonds', name: 'אג"ח ממשלתי', emoji: '🏦', color: '#3b82f6', description: 'אג"ח, כבר בריבית 0%, אין לאן לעלות', scenarioMultiplier: 1.02 },
    ],
    events: [
      { month: 1, headline: '🖨️ הFed מכריז על QE1, $1.75 טריליון בהדפסה', marketImpact: 1.05 },
      { month: 2, headline: '📊 S&P 500 מגיע לתחתית, 666 נקודות (מרץ 2009)', marketImpact: 1.10 },
      { month: 3, headline: '📈 ראלי Bear Market, המניות עולות 20% תוך חודשיים', marketImpact: 1.20 },
      { month: 5, headline: '🥇 זהב עולה ל-$1,000, חשש מאינפלציה', marketImpact: 1.28 },
      { month: 7, headline: '🏠 משכנתאות ב-4%, הנדל"ן מתחיל להתאושש', marketImpact: 1.35 },
      { month: 9, headline: '📊 S&P 500 עלה 50% מהתחתית, הכסף הזול עובד', marketImpact: 1.45 },
      { month: 11, headline: '🖨️ שמועות על QE2, הFed ידפיס עוד', marketImpact: 1.55 },
      { month: 12, headline: '📈 S&P 500 סיים 2009 בעלייה של 65% מהתחתית', marketImpact: 1.65 },
    ],
    marketBenchmark: 1.65,
    lessonTitle: 'כסף זול = נכסי סיכון עולים',
    lessonText:
      'הדפסת כסף מהFed הזרימה טריליונים לשווקים. מי שקנה מניות, נדל"ן או זהב ב-2009 הכפיל ויותר. אג"ח ב-0% לא נתנו כמעט כלום.',
    historicalNote: 'S&P 500 עלה 65% ב-2009 מהתחתית, הזהב עלה 55% ל-$1,200, הנדל"ן התחיל לעלות ב-2012. הFed הדפיס סך $3.5 טריליון בשלושה סבבי QE.',
  },

  // ── 4. קריסת ליהמן ברדרס, 2008 ──
  {
    id: 'lehman_2008',
    title: 'קריסת ליהמן ברדרס',
    emoji: '📉',
    color: '#1e3a5f',
    difficulty: 3,
    year: 2008,
    briefing:
      'ספטמבר 2008. ליהמן ברדרס, בנק השקעות בן 158 שנה, מכריז על פשיטת רגל. $639 מיליארד בנכסים, הקריסה הגדולה בהיסטוריה. הפאניקה מתפשטת לכל העולם. 100,000 ₪ שלך בסכנה.',
    sectors: [
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, נכס פיזי שלא תלוי בבנקים', scenarioMultiplier: 1.25 },
      { id: 'bonds', name: 'אג"ח ממשלתי', emoji: '🏦', color: '#3b82f6', description: 'אג"ח ממשל ארה"ב, "flight to safety"', scenarioMultiplier: 1.20 },
      { id: 'banks', name: 'בנקים', emoji: '🏛️', color: '#7c3aed', description: 'מניות בנקים, Citigroup, AIG, Goldman', scenarioMultiplier: 0.35 },
      { id: 'real_estate', name: 'נדל"ן', emoji: '🏠', color: '#22c55e', description: 'נדל"ן, הסקטור שגרם למשבר', scenarioMultiplier: 0.55 },
    ],
    events: [
      { month: 1, headline: '🏦 ליהמן ברדרס מכריז על פשיטת רגל, $639B', marketImpact: 0.82 },
      { month: 2, headline: '📉 S&P 500 צונח 8.8% ביום אחד, Black Monday 2.0', marketImpact: 0.68 },
      { month: 3, headline: '🏛️ AIG קורסת, הממשלה מחלצת ב-$182 מיליארד', marketImpact: 0.58 },
      { month: 4, headline: '📱 "Bank Run", אנשים מושכים חסכונות בפאניקה', marketImpact: 0.50 },
      { month: 6, headline: '🥇 זהב קופץ ל-$900, "הנכס היחיד שאפשר לסמוך עליו"', marketImpact: 0.45 },
      { month: 8, headline: '📊 S&P 500 ירד 57% מהשיא, התחתית הגיעה', marketImpact: 0.43 },
      { month: 10, headline: '🏛️ הFed מוריד ריבית ל-0% ומתחיל QE', marketImpact: 0.48 },
      { month: 12, headline: '🔄 סימני התייצבות, אבל הנזק עצום', marketImpact: 0.55 },
    ],
    marketBenchmark: 0.55,
    lessonTitle: 'סיכון מערכתי, כשהכל מחובר',
    lessonText:
      'משבר 2008 הראה שכשבנקים גדולים קורסים, הכל נגרר. זהב ואג"ח ממשלתי היו המקלט היחיד. מי שהיה 100% בבנקים איבד 65% מהתיק.',
    historicalNote: 'S&P 500 ירד 57% מהשיא לתחתית. Citigroup ירדה 97%. 8.7 מיליון אמריקאים איבדו את העבודה. לקח עד 2013 ל-S&P 500 לחזור לרמות של 2007.',
  },

  // ── 5. מגפת הקורונה, 2020 ──
  {
    id: 'covid_2020',
    title: 'מגפת הקורונה',
    emoji: '🦠',
    color: '#059669',
    difficulty: 2,
    year: 2020,
    briefing:
      'מרץ 2020. COVID-19 מתפשט בעולם. מדינות נכנסות לסגרים. S&P 500 קורס 34% תוך 23 ימים, הירידה המהירה ביותר בהיסטוריה. אבל האם זו הזדמנות? 100,000 ₪ בידיים שלך.',
    sectors: [
      { id: 'pharma', name: 'פארמה', emoji: '💊', color: '#10b981', description: 'חברות תרופות, Pfizer, Moderna, BioNTech', scenarioMultiplier: 1.85 },
      { id: 'tech', name: 'טכנולוגיה', emoji: '💻', color: '#7c3aed', description: 'Zoom, Amazon, Netflix, עבודה מרחוק', scenarioMultiplier: 1.55 },
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, מגן בזמן אי-ודאות', scenarioMultiplier: 1.25 },
      { id: 'travel', name: 'תיירות ותעופה', emoji: '✈️', color: '#64748b', description: 'חברות תעופה, Delta, United, Boeing', scenarioMultiplier: 0.55 },
    ],
    events: [
      { month: 1, headline: '🦠 WHO מכריזה על מגפה עולמית, 11 במרץ 2020', marketImpact: 0.82 },
      { month: 2, headline: '📉 S&P 500 ירד 34% ב-23 ימים, הכי מהיר אי פעם', marketImpact: 0.66 },
      { month: 3, headline: '🖨️ הFed מדפיס $2.3 טריליון, "Whatever it takes"', marketImpact: 0.72 },
      { month: 4, headline: '💻 Zoom עולה 300%, "עבודה מרחוק זה העתיד"', marketImpact: 0.80 },
      { month: 6, headline: '📈 V-Shape Recovery, השוק חוזר מהר מהצפוי', marketImpact: 0.92 },
      { month: 8, headline: '💊 Moderna ו-Pfizer מדווחות על ניסויי חיסון מוצלחים', marketImpact: 1.02 },
      { month: 10, headline: '📊 NASDAQ בשיא כל הזמנים, למרות המגפה!', marketImpact: 1.12 },
      { month: 12, headline: '💉 חיסונים מאושרים, S&P 500 סיים 2020 בעלייה של 16%', marketImpact: 1.16 },
    ],
    marketBenchmark: 1.16,
    lessonTitle: 'V-Shape, פאניקה ≠ הזדמנות אבודה',
    lessonText:
      'הקורונה הוכיחה שקריסה חדה לא בהכרח אומרת שהכל אבוד. מי שקנה בתחתית (מרץ 2020) הכפיל תוך שנה. פארמה וטכנולוגיה היו המנצחות הגדולות.',
    historicalNote: 'S&P 500 ירד 34% ב-23 ימים אבל חזר תוך 5 חודשים, ההתאוששות המהירה בהיסטוריה. Moderna עלתה 434% ב-2020. תעופה ותיירות ירדו 60%+.',
  },

  // ── 6. בום ה-AI, 2023-2024 ──
  {
    id: 'ai_boom_2023',
    title: 'בום ה-AI של 2023',
    emoji: '🤖',
    color: '#f97316',
    difficulty: 1,
    year: 2023,
    briefing:
      'שנת 2023. ChatGPT שינה את העולם. NVIDIA מזנקת 239% בשנה. "Magnificent 7" שולטות ב-S&P 500. כולם מדברים על AI. 100,000 ₪, תרכב על הגל או תישאר בצד?',
    sectors: [
      { id: 'ai_chips', name: 'שבבי AI', emoji: '🤖', color: '#7c3aed', description: 'NVIDIA, AMD, TSMC, תשתיות ה-AI', scenarioMultiplier: 2.39 },
      { id: 'mag7', name: 'Magnificent 7', emoji: '💻', color: '#22d3ee', description: 'Apple, Microsoft, Google, Amazon, Meta, Tesla, NVIDIA', scenarioMultiplier: 1.75 },
      { id: 'bonds', name: 'אג"ח ממשלתי', emoji: '🏦', color: '#3b82f6', description: 'אג"ח, ריבית 5%, תשואה סולידית', scenarioMultiplier: 1.05 },
      { id: 'traditional', name: 'כלכלה מסורתית', emoji: '🏭', color: '#6b7280', description: 'תעשייה, קמעונאות, בנקים, לא חלק מהבום', scenarioMultiplier: 0.95 },
    ],
    events: [
      { month: 1, headline: '🤖 ChatGPT הגיע ל-100 מיליון משתמשים ב-חודשיים', marketImpact: 1.08 },
      { month: 2, headline: '💻 NVIDIA מדווחת על הכנסות שיא, מנייה קופצת 25% ביום', marketImpact: 1.22 },
      { month: 4, headline: '📈 "Magnificent 7" תרמו כמעט כל תשואת S&P 500', marketImpact: 1.35 },
      { month: 5, headline: '🤖 כל חברה מוסיפה "AI" לשם, שוק ה-AI בטירוף', marketImpact: 1.45 },
      { month: 7, headline: '📊 NVIDIA שווה $1 טריליון, שלישית בהיסטוריה', marketImpact: 1.58 },
      { month: 9, headline: '🏦 ריבית 5.5%, אבל אף אחד לא מסתכל על אג"ח', marketImpact: 1.65 },
      { month: 11, headline: '🤖 OpenAI מגייסת ב-$80B שווי, שיא ל-startup', marketImpact: 1.72 },
      { month: 12, headline: '📈 NVIDIA עלתה 239% בשנה, S&P 500 עלה 24%', marketImpact: 1.80 },
    ],
    marketBenchmark: 1.80,
    lessonTitle: 'FOMO, הגל נראה נהדר, אבל...',
    lessonText:
      'בום ה-AI של 2023 היה אמיתי, אבל ההיסטוריה מלמדת שבום ≠ תשואה מובטחת. גם בבועת הדוט-קום האינטרנט היה אמיתי, אבל המכפילים היו מטורפים.',
    historicalNote: 'NVIDIA עלתה 239% ב-2023, Meta עלתה 194%, S&P 500 עלה 24%. אבל 493 החברות האחרות ב-S&P 500 עלו רק 12%. הריכוזיות הגיעה לרמה היסטורית.',
  },

  // ── 7. משבר הסאבפריים, 2007 ──
  {
    id: 'subprime_2007',
    title: 'משבר הסאבפריים',
    emoji: '🏠',
    color: '#b91c1c',
    difficulty: 2,
    year: 2007,
    briefing:
      'שנת 2007. מחירי הדירות בארה"ב עלו 120% ב-10 שנים. בנקים נותנים משכנתאות לכל אחד, גם בלי הכנסה. "מחירי הדירות לא יורדים" אומרים כולם. 100,000 ₪ בידיים שלך.',
    sectors: [
      { id: 'real_estate', name: 'נדל"ן ובנייה', emoji: '🏠', color: '#22c55e', description: 'קרנות נדל"ן, חברות בנייה, Lennar, D.R. Horton', scenarioMultiplier: 0.45 },
      { id: 'banks', name: 'בנקים', emoji: '🏛️', color: '#1e3a5f', description: 'בנקים גדולים, Bear Stearns, Citigroup', scenarioMultiplier: 0.40 },
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, נכס מקלט מחוץ למערכת הבנקאית', scenarioMultiplier: 1.32 },
      { id: 'bonds', name: 'אג"ח ממשלתי', emoji: '🏦', color: '#3b82f6', description: 'אג"ח ממשל ארה"ב, הנכס הבטוח ביותר', scenarioMultiplier: 1.15 },
    ],
    events: [
      { month: 1, headline: '🏠 סימנים ראשונים, New Century Financial קורסת', marketImpact: 0.95 },
      { month: 2, headline: '📉 חדלות פירעון במשכנתאות סאבפריים עולות ל-15%', marketImpact: 0.88 },
      { month: 4, headline: '🏦 Bear Stearns מציל שתי קרנות סאבפריים מקריסה', marketImpact: 0.78 },
      { month: 5, headline: '🏠 מחירי הדירות מתחילים לרדת, בפעם הראשונה מ-1991', marketImpact: 0.72 },
      { month: 7, headline: '📉 BNP Paribas מקפיא 3 קרנות, "אי אפשר לתמחר את הנכסים"', marketImpact: 0.65 },
      { month: 9, headline: '🥇 זהב קופץ ל-$800, אנשים בורחים מהמערכת הבנקאית', marketImpact: 0.60 },
      { month: 11, headline: '📊 הפסדי בנקים עולים ל-$100 מיליארד, "זה רק ההתחלה"', marketImpact: 0.55 },
      { month: 12, headline: '🏛️ הFed מתחיל להוריד ריבית, מאוחר מדי?', marketImpact: 0.52 },
    ],
    marketBenchmark: 0.52,
    lessonTitle: '"מחירי הדירות לא יורדים", יורדים.',
    lessonText:
      'משבר הסאבפריים הוכיח שנדל"ן יכול לקרוס כמו כל נכס אחר. בנקים שהחזיקו משכנתאות רעילות קרסו. זהב ואג"ח ממשלתי שמרו על ערך.',
    historicalNote: 'מחירי הדירות בארה"ב ירדו 33% מהשיא. Bear Stearns נמכר ב-$2 למניה (היה $170). 3.8 מיליון בתים עוקלו. הנזק הכולל, $10 טריליון.',
  },

  // ── 8. השפל הגדול, 1929 ──
  {
    id: 'great_crash_1929',
    title: 'הקראש הגדול, 1929',
    emoji: '📉',
    color: '#6366f1',
    difficulty: 3,
    year: 1929,
    briefing:
      'אוקטובר 1929. שנות ה-20 התוססות נגמרות בקריסה מוחצת. ביום שחור אחד השוק יורד 13%. מיליוני אנשים מאבדים את חסכונות חייהם. תחילת השפל הגדול. 100,000 ₪ שלך, איך תשרוד?',
    sectors: [
      { id: 'stocks', name: 'מניות', emoji: '📊', color: '#6366f1', description: 'הבורסה האמריקאית, Dow Jones', scenarioMultiplier: 0.11 },
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, ערך קבוע בזמני קריסה', scenarioMultiplier: 1.40 },
      { id: 'bonds', name: 'אג"ח ממשלתי', emoji: '🏦', color: '#3b82f6', description: 'אג"ח ממשל, בטוח אם הממשלה שורדת', scenarioMultiplier: 1.10 },
      { id: 'cash', name: 'מזומן', emoji: '💵', color: '#64748b', description: 'להחזיק מזומן ולחכות, כוח הקנייה עולה בדפלציה', scenarioMultiplier: 1.30 },
    ],
    events: [
      { month: 1, headline: '📈 השוק בשיא, Dow Jones 381 נקודות (3 בספטמבר 1929)', marketImpact: 1.0 },
      { month: 2, headline: '📉 "יום חמישי השחור", 24 באוקטובר, ירידה של 11%', marketImpact: 0.78 },
      { month: 3, headline: '📉 "יום שלישי השחור", 29 באוקטובר, עוד 12% ירידה', marketImpact: 0.60 },
      { month: 4, headline: '🏦 בנקים מתחילים לקרוס, אנשים מאבדים חסכונות', marketImpact: 0.48 },
      { month: 6, headline: '📉 Dow Jones ירד 48% מהשיא, ועדיין לא התחתית', marketImpact: 0.35 },
      { month: 8, headline: '💼 אבטלה מזנקת ל-15%, מיליונים ברחוב', marketImpact: 0.25 },
      { month: 10, headline: '🏦 1,000 בנקים קרסו ב-1930, חסכונות נמחקו', marketImpact: 0.18 },
      { month: 12, headline: '📉 Dow Jones ירד 89% מהשיא, ייקח עד 1954 להתאושש', marketImpact: 0.11 },
    ],
    marketBenchmark: 0.11,
    lessonTitle: 'המשבר הכי גדול בהיסטוריה',
    lessonText:
      'קריסת 1929 היא תזכורת שהשוק יכול לאבד 89% מערכו. מזומן (דפלציה = כוח קנייה עולה) וזהב היו הנכסים היחידים ששמרו על ערך. לקח 25 שנה לשוק להתאושש.',
    historicalNote: 'Dow Jones ירד 89% מהשיא ולקח עד 1954, 25 שנה, לחזור לרמות של 1929. אבטלה הגיעה ל-25%. 9,000 בנקים קרסו. זה המשבר שיצר את ה-SEC וביטוח פיקדונות.',
  },

  // ── 9. משבר המטבעות האסייתי, 1997 ──
  {
    id: 'asian_crisis_1997',
    title: 'משבר המטבעות האסייתי',
    emoji: '💱',
    color: '#0ea5e9',
    difficulty: 3,
    year: 1997,
    briefing:
      'יולי 1997. הבאט התאילנדי קורס. תוך שבועות המשבר מתפשט לכל דרום-מזרח אסיה, קוריאה, אינדונזיה, מלזיה. מטבעות מאבדים 50-80% מערכם. 100,000 ₪ שלך, איך תשרוד?',
    sectors: [
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, מטבע אוניברסלי שלא תלוי בממשלה', scenarioMultiplier: 0.98 },
      { id: 'usd', name: 'דולר אמריקאי', emoji: '💵', color: '#22c55e', description: 'דולר, מטבע המקלט העולמי', scenarioMultiplier: 1.25 },
      { id: 'em_stocks', name: 'שווקים מתעוררים', emoji: '🌏', color: '#ef4444', description: 'מניות אסיה, תאילנד, קוריאה, אינדונזיה', scenarioMultiplier: 0.35 },
      { id: 'us_bonds', name: 'אג"ח ארה"ב', emoji: '🏦', color: '#3b82f6', description: 'אג"ח ממשל ארה"ב, "flight to quality"', scenarioMultiplier: 1.15 },
    ],
    events: [
      { month: 1, headline: '💱 הבאט התאילנדי קורס 20% ביום אחד, 2 ביולי 1997', marketImpact: 0.90 },
      { month: 2, headline: '🌏 המשבר מתפשט, הרופיה האינדונזית צונחת 30%', marketImpact: 0.78 },
      { month: 3, headline: '📉 בורסת הונג קונג צונחת 10% ביום, "Asian Contagion"', marketImpact: 0.68 },
      { month: 5, headline: '🏛️ IMF מחלץ תאילנד ב-$17 מיליארד, "לא מספיק"', marketImpact: 0.60 },
      { month: 6, headline: '💱 הוון הקוריאני קורס 50%, חברות ענק פושטות רגל', marketImpact: 0.52 },
      { month: 8, headline: '💵 כל הכסף בורח לדולר ואג"ח ארה"ב, "Safe Haven"', marketImpact: 0.45 },
      { month: 10, headline: '🏛️ IMF מחלץ קוריאה ב-$57 מיליארד, החילוץ הגדול בהיסטוריה', marketImpact: 0.42 },
      { month: 12, headline: '🌏 רופיה ירדה 80%, באט 50%, וון 50%, הנזק עצום', marketImpact: 0.38 },
    ],
    marketBenchmark: 0.38,
    lessonTitle: 'מטבעות יכולים לקרוס בן-לילה',
    lessonText:
      'משבר 1997 הראה ש"נמרי אסיה" שנראו בלתי ניתנים לעצירה קרסו כשהמטבעות שלהם התמוטטו. דולר ואג"ח ארה"ב היו מקלט. גם כלכלות חזקות פגיעות כשיש חוב גבוה במט"ח.',
    historicalNote: 'הבאט ירד 50%, הרופיה 80%, הוון 50%. תוצר אינדונזיה צנח 13% בשנה. IMF חילץ 3 מדינות ב-$118 מיליארד. המשבר הוכיח שחוב במט"ח + שע"ח קבוע = פצצה מתקתקת.',
  },

  // ── 10. יום שני השחור, 1987 ──
  {
    id: 'black_monday_1987',
    title: 'יום שני השחור, 1987',
    emoji: '🖤',
    color: '#1e1b4b',
    difficulty: 3,
    year: 1987,
    briefing:
      '19 באוקטובר 1987. Dow Jones צונח 22.6% ביום אחד, הירידה הגדולה ביותר ביום בודד בהיסטוריה. מסחר ממוחשב (Program Trading) מגביר את הפאניקה. 100,000 ₪ שלך, איך תגיב?',
    sectors: [
      { id: 'stocks', name: 'מניות', emoji: '📊', color: '#6366f1', description: 'Dow Jones ו-S&P 500, שוק המניות הרחב', scenarioMultiplier: 0.67 },
      { id: 'bonds', name: 'אג"ח ממשלתי', emoji: '🏦', color: '#3b82f6', description: 'אג"ח ממשל ארה"ב, Flight to Safety', scenarioMultiplier: 1.12 },
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, מקלט בזמני פאניקה', scenarioMultiplier: 1.05 },
      { id: 'cash', name: 'מזומן', emoji: '💵', color: '#64748b', description: 'לשבת על מזומן ולחכות', scenarioMultiplier: 1.03 },
    ],
    events: [
      { month: 1, headline: '📈 השוק בשיא, Dow Jones ב-2,722 (אוגוסט 1987)', marketImpact: 1.0 },
      { month: 2, headline: '📉 ירידות מתונות בתחילת אוקטובר, אי-נוחות בשוק', marketImpact: 0.92 },
      { month: 3, headline: '🖤 19 באוקטובר, Dow צונח 508 נקודות (22.6%) ביום אחד!', marketImpact: 0.72 },
      { month: 4, headline: '💻 Program Trading, מחשבים מוכרים אוטומטית ומעמיקים את הנפילה', marketImpact: 0.68 },
      { month: 6, headline: '🏦 הFed מזריק נזילות, "נהיה כאן כדי לתמוך"', marketImpact: 0.72 },
      { month: 8, headline: '📊 השוק מתייצב, אבל הפחד עדיין חזק', marketImpact: 0.75 },
      { month: 10, headline: '📈 התאוששות הדרגתית, Dow חוזר ל-2,000', marketImpact: 0.78 },
      { month: 12, headline: '📊 Dow סיים 1987 בירידה של 33% מהשיא, אבל התאושש תוך שנתיים', marketImpact: 0.67 },
    ],
    marketBenchmark: 0.67,
    lessonTitle: 'מסחר ממוחשב = סיכון מערכתי',
    lessonText:
      'Black Monday הראה שמסחר אוטומטי יכול להגביר פאניקה. הFed הגיב מהר והזריק נזילות, תקדים שחזר על עצמו בכל משבר מאז. השוק התאושש תוך שנתיים.',
    historicalNote: 'Dow Jones ירד 22.6% ביום אחד, שיא שלילי שלא נשבר עד היום. הקריסה הייתה עולמית: הונג קונג -45%, אוסטרליה -42%, בריטניה -26%. לקח שנתיים ל-Dow לחזור לרמות שלפני הקריסה.',
  },

  // ── 11. בועת הנדל"ן ביפן, 1990 ──
  {
    id: 'japan_bubble_1990',
    title: 'הבועה היפנית, 1990',
    emoji: '🇯🇵',
    color: '#dc2626',
    difficulty: 3,
    year: 1990,
    briefing:
      'סוף שנות ה-80. יפן נראית בלתי ניתנת לעצירה. הניקיי ב-39,000. קרקע בטוקיו שווה יותר מכל שטח קליפורניה. "יפן תשתלט על העולם" אומרים כולם. 100,000 ₪ שלך, מה תעשה?',
    sectors: [
      { id: 'nikkei', name: 'ניקיי יפן', emoji: '🇯🇵', color: '#dc2626', description: 'מניות יפניות, ניקיי 225', scenarioMultiplier: 0.38 },
      { id: 'us_stocks', name: 'S&P 500', emoji: '📊', color: '#22c55e', description: 'מניות אמריקאיות, הכלכלה האלטרנטיבית', scenarioMultiplier: 1.30 },
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, ערך יציב בזמני בועות', scenarioMultiplier: 0.95 },
      { id: 'bonds', name: 'אג"ח יפני', emoji: '🏦', color: '#3b82f6', description: 'אג"ח ממשלת יפן, ריבית יורדת = מחיר עולה', scenarioMultiplier: 1.15 },
    ],
    events: [
      { month: 1, headline: '📈 ניקיי 225 בשיא, 38,957 נקודות (29 בדצמבר 1989)', marketImpact: 1.0 },
      { month: 2, headline: '📉 ינואר 1990, ניקיי מתחיל לרדת, 5% בחודש', marketImpact: 0.88 },
      { month: 3, headline: '🏠 מחירי הנדל"ן מתחילים לרדת, הבועה מתפוצצת', marketImpact: 0.78 },
      { month: 5, headline: '📉 ניקיי ירד 30%, בנקים יפניים בבעיה', marketImpact: 0.65 },
      { month: 7, headline: '🏦 בנק יפן מעלה ריבית, דוחק את הבועה', marketImpact: 0.55 },
      { month: 9, headline: '📊 ניקיי ירד 40%, "עשור אבוד" מתחיל', marketImpact: 0.48 },
      { month: 11, headline: '🇺🇸 בינתיים, S&P 500 ממשיך לעלות, ארה"ב הכלכלה החדשה', marketImpact: 0.42 },
      { month: 12, headline: '📉 ניקיי סיים 1990 בירידה של 38%, ייקח 34 שנה להתאושש', marketImpact: 0.38 },
    ],
    marketBenchmark: 0.38,
    lessonTitle: '"עשור אבוד", בועות לוקחות דורות',
    lessonText:
      'הבועה היפנית הוכיחה שגם כלכלה חזקה יכולה לקרוס ולא להתאושש עשרות שנים. מי שפיזר להשקעות מחוץ ליפן (S&P 500) הרוויח, מי ששם הכל בניקיי חיכה 34 שנה.',
    historicalNote: 'ניקיי 225 ירד מ-39,000 ב-1989 ל-7,054 ב-2009, ירידה של 82%. רק במרץ 2024 הניקיי חזר לשיא של 1989. מחירי הנדל"ן בטוקיו עדיין מתחת לרמות של 1990.',
  },

  // ── 12. משבר החוב האירופי, 2011 ──
  {
    id: 'euro_debt_2011',
    title: 'משבר החוב האירופי',
    emoji: '🇪🇺',
    color: '#2563eb',
    difficulty: 2,
    year: 2011,
    briefing:
      'שנת 2011. יוון על סף פשיטת רגל. ספרד ואיטליה רועדות. "PIIGS" (פורטוגל, אירלנד, איטליה, יוון, ספרד) מאיימות להפיל את האירו. 100,000 ₪ שלך, להתרחק מאירופה או לנצל?',
    sectors: [
      { id: 'eu_stocks', name: 'מניות אירופה', emoji: '🇪🇺', color: '#ef4444', description: 'EuroStoxx 50, מדד מניות אירופה', scenarioMultiplier: 0.82 },
      { id: 'us_stocks', name: 'S&P 500', emoji: '📊', color: '#22c55e', description: 'מניות ארה"ב, רחוק מהבעיה', scenarioMultiplier: 1.02 },
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, שיא של $1,900 בספטמבר 2011', scenarioMultiplier: 1.28 },
      { id: 'usd', name: 'דולר אמריקאי', emoji: '💵', color: '#3b82f6', description: 'דולר, מטבע מקלט עולמי', scenarioMultiplier: 1.10 },
    ],
    events: [
      { month: 1, headline: '🇬🇷 יוון מקבלת חבילת חילוץ שנייה, €130 מיליארד', marketImpact: 0.95 },
      { month: 2, headline: '📉 S&P מורידה דירוג של 9 מדינות אירופה', marketImpact: 0.88 },
      { month: 3, headline: '🇪🇸 ספרד, אבטלה 21%, ריבית אג"ח ל-10 שנים מזנקת ל-7%', marketImpact: 0.82 },
      { month: 5, headline: '🥇 זהב שובר שיא, $1,600, בריחה מהמערכת', marketImpact: 0.78 },
      { month: 7, headline: '🇮🇹 איטליה בסכנה, חוב 120% תוצר, ריבית אג"ח עולה', marketImpact: 0.75 },
      { month: 8, headline: '🥇 זהב ב-$1,900, שיא כל הזמנים (עד אז)', marketImpact: 0.72 },
      { month: 10, headline: '🏛️ ECB: "Whatever it takes", דראגי מציל את האירו', marketImpact: 0.78 },
      { month: 12, headline: '📊 אירופה ירדה 18%, ארה"ב בסדר, זהב +28%', marketImpact: 0.82 },
    ],
    marketBenchmark: 0.82,
    lessonTitle: '"Whatever it takes", מילים ששינו הכל',
    lessonText:
      'משבר החוב האירופי הראה שמדינות יכולות להגיע לסף פשיטת רגל. המשפט "Whatever it takes" של דראגי (ECB) הציל את האירו ולימד שבנקים מרכזיים הם הקו האחרון.',
    historicalNote: 'יוון חתכה 50% מהחוב למשקיעים (Haircut). אבטלה ביוון הגיעה ל-28%. הזהב עלה ל-$1,921 בספטמבר 2011. המשפט של דראגי (יולי 2012) סיים את המשבר בפועל.',
  },

  // ── 13. קריסת הבורסה הסינית, 2015 ──
  {
    id: 'china_crash_2015',
    title: 'קריסת הבורסה הסינית',
    emoji: '🇨🇳',
    color: '#ef4444',
    difficulty: 2,
    year: 2015,
    briefing:
      'קיץ 2015. הבורסה בשנגחאי עלתה 150% בשנה, מונעת ע"י מיליוני משקיעים קטנים סיניים שלוקחים מרג\'ין. הממשלה עודדה אותם. ואז, הכל מתפוצץ. 100,000 ₪ שלך, איך תנווט?',
    sectors: [
      { id: 'china', name: 'שנגחאי קומפוזיט', emoji: '🇨🇳', color: '#ef4444', description: 'מניות סיניות, הבורסה המקומית', scenarioMultiplier: 0.55 },
      { id: 'us_stocks', name: 'S&P 500', emoji: '📊', color: '#22c55e', description: 'מניות ארה"ב, נפגעות מהתחברות', scenarioMultiplier: 0.98 },
      { id: 'gold', name: 'זהב', emoji: '🥇', color: '#facc15', description: 'זהב, מקלט בזמן אי-ודאות', scenarioMultiplier: 1.08 },
      { id: 'bonds', name: 'אג"ח ארה"ב', emoji: '🏦', color: '#3b82f6', description: 'אג"ח ממשל ארה"ב, Safe Haven', scenarioMultiplier: 1.12 },
    ],
    events: [
      { month: 1, headline: '📈 שנגחאי קומפוזיט בשיא, 5,178 נקודות (12 ביוני 2015)', marketImpact: 1.0 },
      { month: 2, headline: '📉 ירידה של 30% תוך 3 שבועות, פאניקה!', marketImpact: 0.72 },
      { month: 3, headline: '🇨🇳 הממשלה מקפיאה מסחר ב-1,300 מניות, חצי מהבורסה', marketImpact: 0.65 },
      { month: 5, headline: '📉 "Black Monday" סיני, ירידה של 8.5% ביום אחד', marketImpact: 0.58 },
      { month: 6, headline: '🌐 ההדף מכה בשווקים עולמיים, Dow Jones ירד 1,000 נקודות', marketImpact: 0.55 },
      { month: 8, headline: '💱 סין מפחיתה את היואן, חשש ממלחמת מטבעות', marketImpact: 0.55 },
      { month: 10, headline: '📊 שנגחאי ירד 45% מהשיא, טריליוני דולרים נמחקו', marketImpact: 0.55 },
      { month: 12, headline: '🇨🇳 "Circuit Breakers" חדשים, ניסיון למנוע קריסה נוספת', marketImpact: 0.55 },
    ],
    marketBenchmark: 0.55,
    lessonTitle: 'מרג\'ין + FOMO = קטסטרופה',
    lessonText:
      'הקריסה הסינית הוכיחה שכשמיליוני משקיעים לא מנוסים קונים במרג\'ין (חוב), הכל מתפוצץ. הממשלה ניסתה לעצור את הנפילה ונכשלה. שום התערבות לא יכולה לעצור בועה.',
    historicalNote: 'שנגחאי קומפוזיט ירד 45% תוך חודשיים. $5 טריליון נמחקו. 90 מיליון משקיעים קטנים סיניים נפגעו. הממשלה הקפיאה מסחר, אסרה מכירות בחסר, ואפילו עצרה סוחרים, לא עזר.',
  },

  // ── 14. משבר רוסיה-אוקראינה, 2022 ──
  {
    id: 'ukraine_2022',
    title: 'פלישת רוסיה לאוקראינה',
    emoji: '⚔️',
    color: '#f59e0b',
    difficulty: 2,
    year: 2022,
    briefing:
      'פברואר 2022. רוסיה פולשת לאוקראינה. מחירי האנרגיה מזנקים. אירופה תלויה בגז רוסי. אינפלציה דוהרת. הFed מעלה ריבית באגרסיביות. 100,000 ₪ שלך, לאן הכסף צריך ללכת?',
    sectors: [
      { id: 'energy', name: 'אנרגיה ונפט', emoji: '⛽', color: '#f97316', description: 'חברות נפט וגז, Exxon, Chevron, Shell', scenarioMultiplier: 1.65 },
      { id: 'defense', name: 'תעשייה ביטחונית', emoji: '🛡️', color: '#6b7280', description: 'חברות נשק, Lockheed, Raytheon, Northrop', scenarioMultiplier: 1.35 },
      { id: 'tech', name: 'טכנולוגיה', emoji: '💻', color: '#7c3aed', description: 'NASDAQ, נפגע מעליית ריבית', scenarioMultiplier: 0.67 },
      { id: 'bonds', name: 'אג"ח ארוך', emoji: '🏦', color: '#3b82f6', description: 'אג"ח ממשל ארה"ב ל-30 שנה', scenarioMultiplier: 0.68 },
    ],
    events: [
      { month: 1, headline: '⚔️ 24 בפברואר, רוסיה פולשת לאוקראינה. העולם בהלם', marketImpact: 0.92 },
      { month: 2, headline: '⛽ מחיר הנפט מזנק ל-$130, שיא מ-2008', marketImpact: 0.88 },
      { month: 3, headline: '🇪🇺 אירופה חוסמת גז רוסי, מחירי אנרגיה מרקיעי שחקים', marketImpact: 0.82 },
      { month: 5, headline: '🏦 הFed מעלה ריבית 0.75%, ההעלאה הגדולה ביותר מ-1994', marketImpact: 0.78 },
      { month: 6, headline: '📉 NASDAQ נכנס ל-Bear Market, ירידה של 33% מהשיא', marketImpact: 0.72 },
      { month: 8, headline: '🔥 אינפלציה בארה"ב 9.1%, שיא 40 שנה', marketImpact: 0.70 },
      { month: 10, headline: '⛽ אנרגיה עלתה 65%, הסקטור הטוב ביותר ב-S&P 500', marketImpact: 0.72 },
      { month: 12, headline: '📊 S&P 500 ירד 20% ב-2022, השנה הגרועה מ-2008', marketImpact: 0.80 },
    ],
    marketBenchmark: 0.80,
    lessonTitle: 'אנרגיה ואינפלציה, כוח ההרס',
    lessonText:
      'משבר 2022 הראה שמלחמה + אנרגיה + אינפלציה = קומבו הרסני לשווקים. אנרגיה וביטחון היו המנצחים, טכנולוגיה ואג"ח ארוך נפגעו קשה מעליית הריבית.',
    historicalNote: 'NASDAQ ירד 33%, S&P 500 ירד 20%. אנרגיה עלתה 65%. אג"ח ל-30 שנה ירד 40%, הגרוע אי פעם. SVB קרס בגלל הפסדי אג"ח. האינפלציה בארה"ב הגיעה ל-9.1%, הגבוהה ביותר מ-1981.',
  },
];

/** Grade thresholds based on portfolio return */
export function calcGrade(finalValue: number, startingCapital: number): import('./scenarioLabTypes').ScenarioGrade {
  const returnPct = (finalValue - startingCapital) / startingCapital;
  if (returnPct >= -0.05) return 'S'; // Lost ≤5% or gained
  if (returnPct >= -0.15) return 'A';
  if (returnPct >= -0.25) return 'B';
  if (returnPct >= -0.35) return 'C';
  return 'F';
}

/** Grade display config */
export const GRADE_CONFIG: Record<import('./scenarioLabTypes').ScenarioGrade, { color: string; label: string; emoji: string }> = {
  S: { color: '#facc15', label: 'מצוין!', emoji: '🏆' },
  A: { color: '#22c55e', label: 'מעולה', emoji: '⭐' },
  B: { color: '#3b82f6', label: 'טוב', emoji: '👍' },
  C: { color: '#f97316', label: 'בינוני', emoji: '😅' },
  F: { color: '#ef4444', label: 'כשלון', emoji: '💸' },
};

/** Rewards per grade */
export const GRADE_REWARDS: Record<import('./scenarioLabTypes').ScenarioGrade, { xp: number; coins: number }> = {
  S: { xp: 40, coins: 30 },
  A: { xp: 30, coins: 20 },
  B: { xp: 20, coins: 15 },
  C: { xp: 15, coins: 10 },
  F: { xp: 10, coins: 5 },
};
