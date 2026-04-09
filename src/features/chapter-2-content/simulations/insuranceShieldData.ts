/** Insurance and life event data for the "Insurance Shield" simulation (Module 2-14) */

import {
  InsuranceType,
  LifeEvent,
  InsuranceShieldConfig,
} from './insuranceShieldTypes';

const insurances: InsuranceType[] = [
  {
    id: 'hova',
    name: 'ביטוח חובה',
    lottie: require('../../../../assets/lottie/wired-flat-504-school-bus-hover-pinch.json'),
    monthlyCost: 200,
    annualCost: 2_400,
    covers: ['car-accident', 'car-injury'],
    description: 'נזקי גוף בתאונות דרכים',
  },
  {
    id: 'makif',
    name: 'ביטוח מקיף',
    lottie: require('../../../../assets/lottie/wired-flat-457-shield-security-hover-pinch.json'),
    monthlyCost: 350,
    annualCost: 4_200,
    covers: ['car-accident', 'car-theft', 'car-damage'],
    description: 'גניבה, תאונות, ונזקי טבע',
  },
  {
    id: 'tsad-gimel',
    name: 'ביטוח צד ג׳',
    lottie: require('../../../../assets/lottie/wired-flat-402-legal-balance-legal-hover-pinch.json'),
    monthlyCost: 80,
    annualCost: 960,
    covers: ['third-party-damage'],
    description: 'נזק לרכוש של אחרים',
  },
  {
    id: 'dira',
    name: 'ביטוח דירה ותכולה',
    lottie: require('../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json'),
    monthlyCost: 80,
    annualCost: 960,
    covers: ['home-break-in', 'home-damage'],
    description: 'פריצות, שריפות, נזקי מבנה ותכולת הבית',
  },
  {
    id: 'briut-mashlim',
    name: 'ביטוח בריאות משלים',
    lottie: require('../../../../assets/lottie/wired-flat-436-love-care-hover-pinch.json'),
    monthlyCost: 50,
    annualCost: 600,
    covers: ['surgery', 'medical-emergency', 'hospital'],
    description: 'ניתוחים, רפואת מומחים ותרופות דרך הקופה',
  },
  {
    id: 'nituchim',
    name: 'ביטוח ניתוחים פרטי',
    lottie: require('../../../../assets/lottie/wired-flat-426-brain-hover-pinch.json'),
    monthlyCost: 90,
    annualCost: 1_080,
    covers: ['surgery'],
    description: 'בחירת מנתח ובי״ח פרטי — כפל על בריאות משלים!',
  },
  {
    id: 'nesiot',
    name: 'ביטוח נסיעות לחו״ל',
    lottie: require('../../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json'),
    monthlyCost: 35,
    annualCost: 420,
    covers: ['travel-medical', 'travel-emergency'],
    description: 'אשפוז, טיפול רפואי ואובדן מטען בחו״ל',
  },
  {
    id: 'haim',
    name: 'ביטוח חיים',
    lottie: require('../../../../assets/lottie/wired-flat-20-love-heart-hover-heartbeat.json'),
    monthlyCost: 80,
    annualCost: 960,
    covers: ['life-insurance'],
    description: 'פיצוי כספי למשפחה במקרה מוות או אובדן כושר עבודה',
  },
];

/** IDs of insurances that overlap (duplicate trap) */
const DUPLICATE_PAIRS: [string, string][] = [
  ['briut-mashlim', 'nituchim'], // ניתוחים already covered by בריאות משלים
];

const lifeEvents: LifeEvent[] = [
  {
    id: 'flat-tire-fender',
    description: 'שריטה ברכב בחנייה של הקניון — נזק ₪5,000',
    lottie: require('../../../../assets/lottie/wired-flat-504-school-bus-hover-pinch.json'),
    damage: 5_000,
    requiredInsurance: ['makif'],
    severity: 'minor',
  },
  {
    id: 'home-break-in',
    description: 'פריצה לדירה! מחשב נייד, טלוויזיה ותכשיטים נגנבו — נזק ₪25,000',
    lottie: require('../../../../assets/lottie/wired-flat-63-home-hover-3d-roll.json'),
    damage: 25_000,
    requiredInsurance: ['dira'],
    severity: 'major',
  },
  {
    id: 'knee-surgery',
    description: 'קרע ברצועה צולבת בברך — ניתוח פרטי דחוף — נזק ₪60,000',
    lottie: require('../../../../assets/lottie/wired-flat-426-brain-hover-pinch.json'),
    damage: 60_000,
    requiredInsurance: ['briut-mashlim'],
    severity: 'major',
  },
  {
    id: 'travel-hospital',
    description: 'דלקת ריאות קשה בטיול בדרום אמריקה — אשפוז ₪180,000',
    lottie: require('../../../../assets/lottie/wired-flat-782-compass-hover-pinch.json'),
    damage: 180_000,
    requiredInsurance: ['nesiot'],
    severity: 'catastrophic',
  },
  {
    id: 'severe-car-accident',
    description: 'פגיעה ברכב חונה יקר ונזקי גוף לנהג השני — נזק ₪350,000',
    lottie: require('../../../../assets/lottie/wired-flat-483-building-hover-blinking.json'),
    damage: 350_000,
    requiredInsurance: ['tsad-gimel', 'hova'],
    severity: 'catastrophic',
  },
  {
    id: 'life-insurance-event',
    description: 'אובדן כושר עבודה עקב תאונה — המשפחה צריכה רשת ביטחון — ₪1,000,000',
    lottie: require('../../../../assets/lottie/wired-flat-20-love-heart-hover-heartbeat.json'),
    damage: 1_000_000,
    requiredInsurance: ['haim'],
    severity: 'catastrophic',
  },
];

export { DUPLICATE_PAIRS };

export const insuranceShieldConfig: InsuranceShieldConfig = {
  availableInsurances: insurances,
  events: lifeEvents,
  monthlyBudget: 800,
};
