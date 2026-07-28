import type { Benefit } from './types';

export const BRIDGE_BENEFITS: Benefit[] = [
  // ── 📈 השקעות ──
  // ★ REAL PARTNER: Altshuler Shaham Trade ★
  {
    id: 'bridge-invest-altshuler',
    title: 'חשבון מסחר, אלטשולר שחם טרייד',
    description:
      'אלטשולר שחם טרייד — הברוקר הישראלי המתקדם.\n' +
      '• אפס דמי ניהול, פטור מלא ללא הגבלת זמן.\n' +
      '• מינימום נמוך, מתחילים מ-₪5,000 בלבד.\n' +
      '• עמלות אטרקטיביות למסחר בארץ ובחו"ל.\n' +
      '• מערכת מסחר מתקדמת, אפליקציה ומחשב, שברי מניות, פרה ואפטר-מרקט, והמרת מט"ח בזמן אמת.\n' +
      '• גב מקצועי, 30+ שנות ניסיון וצוות תמיכה בחדרי המסחר בישראל ובארה"ב.\n' +
      '• פתיחת חשבון דיגיטלית בפחות מ-10 דקות.',
    partnerName: 'אלטשולר שחם טרייד',
    partnerLogo: '📈',
    partnerLogoImage: { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/bridge-logos/altshuler.png' },
    // Re-priced 4000→3000 (Moni 2026-06-13) → 3000→2500 (Yoav board decision
    // 2026-06-18): Bridge is the working monetization engine (redeems 1→1→5/wk);
    // median bridge-viewer balance ~694 (P90 ~3,089). 2500 brings the top tier
    // closer to reach. Coins are only an affiliate-unlock gate → lowering = upside.
    costCoins: 2500,
    category: 'investments',
    isAvailable: true,
    reward: 'מתנת הצטרפות ₪200 + קורס שוק ההון בשווי ₪1,400 במתנה',
    partnerUrl: 'https://digitalsolutions.as-invest.co.il/trade_OnBoarding/?utm_source=Finplay&utm_medium=link',
    isPartnerAd: true,
  },

  // ★ REAL PARTNER: Interactive Israel (US brokerage focus) ★
  {
    id: 'bridge-invest-inter-il',
    title: 'חשבון מסחר, אינטראקטיב ישראל',
    description:
      '⭐ יתרון: מעולה למי שסוחר בניירות ערך זרים.\n\n' +
      'אינטראקטיב ישראל — מסחר בארה"ב ו-170 שווקים נוספים עם עמלות מהזולות בישראל.\n' +
      '• עמלת מסחר 0.01$ למניה (מינ\' 2.5$), ללא דמי ניהול / שמירה.\n' +
      '• השקעה חוזרת אוטומטית בהוראת קבע (DCA) למניות ותעודות סל.\n' +
      '• ניכוי מס רווחי הון אוטומטי — בלי טופס 1325 בסוף השנה.\n' +
      '• המרת מט"ח בשער רציף — חיסכון של ~4 אגורות מול הבנקים, עמלה 10₪ עד המרה של 500K₪.\n' +
      '• ביטוח SIPC פדרלי עד $500K, FDIC עד $2.5M, ביטוח מורחב של Lloyds עד $30M.\n' +
      '• הפקדה מהירה במערכת בנקאות פתוחה — דקה ופותחים חשבון.',
    partnerName: 'אינטראקטיב ישראל',
    partnerLogo: '🌎',
    partnerLogoImage: { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/bridge-logos/interactive.jpg' },
    // Re-priced 4000→2500 (Moni 2026-06-13): premium tier, reachable by engaged users.
    costCoins: 2500,
    category: 'investments',
    isAvailable: true,
    reward: 'עמלות קניה ומכירה הכי זולות בישראל',
    partnerUrl: 'https://lp3.inter-il.com/ab/790',
    isPartnerAd: true,
  },

  // ── 🏦 חשבונות בנק, placeholder ──
  {
    id: 'bridge-bank-partner-slot',
    title: '🏦 מקום שמור לשותף בנקאי',
    description: 'בקרוב נוסיף כאן הצעה בלעדית מגוף בנקאי מוביל בישראל. המשיכו לצבור מטבעות!',
    partnerName: 'שותף בנקאי',
    partnerLogo: '🏦',
    lottieSource: require('../../../assets/lottie/wired-flat-483-building-hover-blinking.json') as number,
    costCoins: 0,
    category: 'bank-accounts',
    isAvailable: false,
    reward: 'בקרוב...',
    partnerAdSlot: true,
  },

  // ── 🛡️ ביטוח ── ★ REAL PARTNER: Cover ★
  {
    id: 'bridge-insurance-cover',
    title: 'כל הביטוחים והחסכונות שלך — במקום אחד',
    description:
      'קרן הפנסיה שפתחו לכם פעם מזמן, הביטוח הזה שלא יודעים מה הוא נותן ' +
      'וכמה הוא עולה ודמי הניהול המופרזים בביטוח המנהלים ממקום העבודה הראשון, נשמע מוכר מדי?\n\n' +
      'ב-Cover תוכלו לראות את כל הביטוחים וכל החסכונות במקום אחד ולקבל ' +
      'המלצות שוטפות ואוטומטיות לשיפור התנאים והוזלת העלויות שלכם.\n\n' +
      'ככה שקוף, בלי התחייבות ופתוח לכולם.',
    partnerName: 'Cover',
    partnerLogo: '🛡️',
    partnerLogoImage: { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/bridge-logos/cover.png' },
    // Re-priced 2000→500 (Moni 2026-06-13): ENTRY tier. A free, no-commitment
    // tracking service is the natural FIRST redemption. 500 ≤ the p25 balance
    // (~635), so most bridge viewers can unlock it today → kicks off the
    // first-redemption habit that the whole coin economy currently lacks
    // (1 redemption in 30 days). See dashboard 746425.
    costCoins: 500,
    category: 'insurance',
    isAvailable: true,
    reward: 'מעקב חינמי אחר כל הביטוחים והחסכונות שלך — בלי התחייבות',
    partnerUrl: 'https://my.coverai.co.il/?li=finplay',
    isPartnerAd: true,
  },

  // ★ REAL PARTNER: הגשמה פיננסית (boutique pension agency) ★
  // TODO(Yoav 2026-07-28): partnerUrl still missing — Yoav is sending the
  // partner link separately. Until it lands this stays isAvailable:false so
  // nobody can spend coins on a redemption that opens nothing. To go live:
  // fill partnerUrl + flip isAvailable to true (and confirm costCoins with Moni).
  {
    id: 'bridge-insurance-hagshama',
    title: 'ליווי פנסיוני אישי, הגשמה פיננסית',
    description:
      'לא עוד אופטימיזציה אוטומטית. ליווי אמיתי, של בן אדם אחד, לאורך זמן.\n\n' +
      'בעולם שבו כל אפליקציה מבטיחה לכם "לסדר את כל הביטוחים בקליק אחד", ' +
      'הגשמה פיננסית בוחרת ללכת בכיוון ההפוך: סוכנות פנסיונית בוטיקית, שבה אתם ' +
      'מלווים בכל רגע נתון על ידי אדם אחד שמכיר אתכם, את המשפחה שלכם ואת הצרכים ' +
      'שמשתנים עם הזמן — ולא תמונת מצב חד-פעמית שמופקת על ידי מנוע המלצות.\n\n' +
      'לא תשמעו "העלו מסמכים וחכו לעדכון", אלא:\n' +
      '• שתי פגישות עומק ותוכנית מסודרת בכתב.\n' +
      '• ערוץ וואטסאפ וטלפון אישי, מענה תוך יום עסקים.\n' +
      '• סקירה שנתית יזומה, לא תזכורת שנשלחת אוטומטית.\n' +
      '• ליווי שגדל אתכם: נישואין, ילד, שינוי בהכנסה — ולא מערכת שמחכה שתלחצו על הכפתור.\n\n' +
      'התוצאה: לא רק "כל הביטוחים והפיננסים במקום אחד", אלא מישהו שאחראי שהם ' +
      'נכונים בשבילכם — היום ובעוד עשור.',
    partnerName: 'הגשמה פיננסית',
    partnerLogo: '🏡',
    partnerLogoImage: { uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/bridge-logos/hagshama.jpeg' },
    // 1000 (Yoav 2026-07-28): mid tier — above Cover's 500 entry slot, well
    // under the 2500 investment partners, so an engaged learner can reach it.
    costCoins: 1000,
    category: 'insurance',
    isAvailable: false,
    reward: 'ליווי אישי מסוכן אחד: שתי פגישות עומק ותוכנית פנסיונית בכתב',
    isPartnerAd: true,
  },

  // ── 💳 כרטיסי אשראי, placeholder ──
  {
    id: 'bridge-cc-partner-slot',
    title: '💳 מקום שמור לחברת כרטיסי אשראי',
    description: 'בקרוב נוסיף כאן הצעה בלעדית מחברת כרטיסי אשראי מובילה בישראל, הטבות, קאשבק, ועוד.',
    partnerName: 'שותף כרטיסי אשראי',
    partnerLogo: '💳',
    lottieSource: require('../../../assets/lottie/wired-flat-291-coin-dollar-hover-pinch.json') as number,
    costCoins: 0,
    category: 'credit-cards',
    isAvailable: false,
    reward: 'בקרוב...',
    partnerAdSlot: true,
  },

  // ── 📚 השכלה, placeholder ──
  {
    id: 'bridge-edu-partner-slot',
    title: '📚 מקום שמור לשותף חינוכי',
    description: 'בקרוב נוסיף כאן הצעה בלעדית מגוף חינוכי או יועץ פיננסי. המשיכו לצבור מטבעות!',
    partnerName: 'שותף חינוכי',
    partnerLogo: '📚',
    lottieSource: require('../../../assets/lottie/wired-flat-112-book-hover-closed.json') as number,
    costCoins: 0,
    category: 'education',
    isAvailable: false,
    reward: 'בקרוב...',
    partnerAdSlot: true,
  },
];
