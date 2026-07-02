import type { ImageSource } from "expo-image";

/**
 * מועדון הרצף — קונפיגורציית הטרקלין.
 *
 * הטרקלין = סצנה אחת (Higgsfield, מוגשת מ-Vercel Blob דרך /api/img) עם
 * 3 שולחנות-נושא. כל שולחן ממוקם על הסצנה באחוזים (hotspot) ומקבל zoom
 * קולנועי בלחיצה (useLoungeCamera). הקואורדינטות מכוילות מול התמונה
 * שנוצרה — עדכון סצנה ⇒ כיול מחדש של hotspots בלבד, אפס שינויי קוד.
 */
export type TableId = "stocks" | "realestate" | "savings";

export interface LoungeTable {
  id: TableId;
  titleHe: string;
  /** תת-כותרת קצרה על צ'יפ-השולחן בטרקלין */
  subtitleHe: string;
  emoji: string;
  /** צבע-מבטא לזוהר/מסגרת של השולחן */
  accent: string;
  /**
   * אמנות קפטן-שארק מחופש-לשולחן לכרטיסי-הקרוסלה (בסגנון בר). וובף שקוף
   * מוגש מ-Vercel Blob דרך /api/img — לא bundled. אופציונלי: בזמן שבר
   * מפיק, הקלף נופל חן לאמוג'י (fallback). מלא פר-שולחן כשהנכס חי.
   */
  cardArtUri?: string;
  /** מרכז ה-hotspot על הסצנה, באחוזים מרוחב/גובה התמונה */
  hotspot: { cxPct: number; cyPct: number };
  /** עוצמת הזום בכניסה לשולחן */
  zoomScale: number;
}

export const LOUNGE_TABLES: LoungeTable[] = [
  {
    id: "stocks",
    titleHe: "שוק ההון",
    subtitleHe: "מדדים, ריבית-דריבית ומהלכים",
    emoji: "📈",
    accent: "#38bdf8",
    // קפטן שארק כאנליסט שוק-הון (בר, nano_banana_pro, שקוף) — פיילוט
    cardArtUri: "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/club/cards/shark-stocks.webp",
    // מכויל מול lounge-scene-v1 (שולחן-ההולוגרמות, שמאל-מרכז)
    hotspot: { cxPct: 23, cyPct: 53 },
    zoomScale: 1.9,
  },
  {
    id: "realestate",
    titleHe: "נדל\"ן",
    subtitleHe: "דירה, משכנתא והחלטות גדולות",
    emoji: "🏠",
    accent: "#fbbf24",
    // מכויל מול lounge-scene-v1 (שולחן-הבניינים המוזהב, מרכז-תחתון)
    hotspot: { cxPct: 47, cyPct: 78 },
    zoomScale: 1.9,
  },
  {
    id: "savings",
    titleHe: "חיסכון",
    subtitleHe: "קרן חירום, מינוס והרגלים",
    emoji: "🪙",
    accent: "#34d399",
    // מכויל מול lounge-scene-v1 (שולחן תיבת-האוצר, ימין-מרכז)
    hotspot: { cxPct: 78, cyPct: 60 },
    zoomScale: 1.9,
  },
];

/**
 * סצנת הטרקלין (Higgsfield nano_banana_pro → Vercel Blob, 2.7.26). מוגשת
 * דרך /api/img (toProxiedImageUri). ה-hotspots באחוזי-**תמונה** — לכן
 * ה-Sheet מרנדר את הסצנה בתוך frame בגאומטריית-cover מחושבת (SCENE_AR)
 * ולא סומך על contentFit="cover" של המסך: כך שולחן נשאר מתחת לאצבע
 * בכל יחס-מסך. SCENE_BLUR_URI = וריאנט מטושטש-מראש (ffmpeg gblur) ל-DOF
 * crossfade כשהדק נפתח — טשטוש-ריצה ב-GPU יקר באנדרואיד; תמונה מוכנה = חינם.
 */
export const SCENE_URI: string | null =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/club/lounge-scene-v1.jpg";
export const SCENE_BLUR_URI: string | null =
  "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/club/lounge-scene-v1-blur.jpg";
/** יחס רוחב/גובה של הסצנה (768×1376) — בסיס חישוב ה-frame */
export const SCENE_AR = 768 / 1376;

/** גודל-מגע מינימלי ל-hotspot (נגישות: 48dp+) */
export const HOTSPOT_TOUCH = 96;

export type { ImageSource };
