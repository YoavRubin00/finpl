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
    partnerLogoImage: require('../../../assets/IMAGES/ALTSHULER.png') as number,
    costCoins: 3000,
    category: 'investments',
    isAvailable: true,
    reward: 'מתנת הצטרפות ₪200 + קורס שוק ההון בשווי ₪1,400 במתנה',
    partnerUrl: 'https://digitalsolutions.as-invest.co.il/trade_OnBoarding/?utm_source=Finplay&utm_medium=link',
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

  // ── 🛡️ ביטוח, placeholder ──
  {
    id: 'bridge-insurance-partner-slot',
    title: '🛡️ מקום שמור לשותף ביטוחי',
    description: 'בקרוב נוסיף כאן הצעה בלעדית מגוף ביטוחי מוביל. המשיכו לצבור מטבעות!',
    partnerName: 'שותף ביטוחי',
    partnerLogo: '🛡️',
    lottieSource: require('../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json') as number,
    costCoins: 0,
    category: 'insurance',
    isAvailable: false,
    reward: 'בקרוב...',
    partnerAdSlot: true,
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
