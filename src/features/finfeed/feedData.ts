import type { FeedItem, FeedComic, FeedVideo } from "./types";
import { LIFESTYLE_VIDEOS } from "../inter-module-break/lifestyleVideoConfig";

// Comics removed, will be replaced by NotebookLM summary infographics per module
export const COMIC_FEED_ITEMS: FeedComic[] = [];

const BENBEN_CDN = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/video/benben';

/** BENBEN creator videos, one is pinned at feed position 7, rotating each session */
// Deterministic per-video like counts so the feed feels populated (1,100–9,800 range).
const BENBEN_LIKE_SEEDS = [3840, 5120, 2780, 8230, 1460, 6290, 4710, 9820, 2150, 7340, 3970, 5680];
const BENBEN_SAVE_SEEDS = [120, 240, 95, 410, 62, 280, 195, 520, 88, 330, 175, 245];
export const BENBEN_VIDEOS: FeedVideo[] = Array.from({ length: 12 }, (_, i) => ({
  id: `benben-${i + 1}`,
  type: "video" as const,
  title: "",
  description: "",
  category: "Investing" as const,
  videoId: `benben-${i + 1}`,
  localVideo: { uri: `${BENBEN_CDN}/benben-${i + 1}.mp4` },
  durationMinutes: 1,
  pyramidLayer: 1 as const,
  likes: BENBEN_LIKE_SEEDS[i] ?? 2500,
  saves: BENBEN_SAVE_SEEDS[i] ?? 120,
}));

/**
 * Micro-learn videos, pinned at feed position 8, rotating each session.
 * All videos served from Vercel Blob CDN — never bundled into the app, never
 * cached on disk client-side; ExpoVideo streams them on-demand.
 */
export const MICRO_LEARN_VIDEOS: FeedVideo[] = [
  {
    id: "ml-reach-people",
    type: "video" as const,
    title: "",
    description: "",
    category: "Investing" as const,
    videoId: "ml-reach-people",
    localVideo: {
      uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/video/microlearn/reach-people-nrGwo70N9aS61srMhizpuDmoT55Htu.mp4',
    },
    durationMinutes: 1,
    pyramidLayer: 1 as const,
    likes: 4180,
    saves: 215,
  },
  {
    id: "ml-ribit-darbit",
    type: "video" as const,
    title: "",
    description: "",
    category: "Investing" as const,
    videoId: "ml-ribit-darbit",
    localVideo: {
      uri: 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/video/microlearn/ribit-darbit.mp4',
    },
    durationMinutes: 1,
    pyramidLayer: 1 as const,
    likes: 5240,
    saves: 287,
    moduleId: "mod-1-1",
    moduleIndex: 0,
    chapterId: "chapter-1",
    storeChapterId: "ch-1",
  },
];

/**
 * Captain Shark "Lifestyle" reels — 9:16 viral-style clips of Finn skiing,
 * yachting, DJing. Surfaced in-feed as natural scroll-stoppers (between
 * lessons/games/quotes) and ALSO triggered between modules in LessonFlow.
 *
 * URIs resolve through `lifestyleVideoConfig.ts` → FINN_MANIFEST with
 * priority blobUrl > rawUrl > placeholder, so a single Blob upload script
 * upgrades them everywhere they appear.
 */
/**
 * Bottom-bubble caption shown over each lifestyle reel in the feed.
 * Half-sentence, viral-reels style: [activity/place] from [financial source].
 * Single-line — `description` deliberately empty for a clean reels look.
 */
const LIFESTYLE_FEED_TITLES: Record<string, { title: string; description: string }> = {
  "finn-life-ski":          { title: "סקי בחופשה שהדיווידנדים מימנו",     description: "" },
  "finn-life-yacht":        { title: "יאכטה מההכנסה הפסיבית של החודש",    description: "" },
  "finn-life-festival":     { title: "פסטיבל מהבונוס השנתי",              description: "" },
  "finn-life-valt-ski":     { title: "וואל טורנס מהרווח של S&P",          description: "" },
  "finn-life-valt-apres":   { title: "בירה ונקניקיה מהריבית של החודש",     description: "" },
  "finn-life-valt-hottub":  { title: "ג'קוזי על חשבון תיק האג\"ח",         description: "" },
  "finn-life-eilat-party":  { title: "מסיבת חוף מההכנסה הפסיבית",          description: "" },
  "finn-life-eilat-beach":  { title: "חוף מוש על חשבון הדילים",            description: "" },
  "finn-life-eilat-mall-shop": { title: "קניות מהכסף שהרווחתי במניות",     description: "" },
  "finn-life-eilat-mall-ice":  { title: "החלקה על הקרח מהבונוס של ה-ETF", description: "" },
  "finn-life-eilat-dolphins":  { title: "צלילה עם דולפינים מהיעד שהשגתי", description: "" },
};

const LIFESTYLE_LIKE_SEEDS = [9320, 7180, 8540, 11200, 8470, 9930, 14380, 12150, 9870, 11440, 16720];
const LIFESTYLE_SAVE_SEEDS = [612, 480, 553, 720, 538, 645, 890, 762, 615, 730, 1050];

export const LIFESTYLE_FEED_VIDEOS: FeedVideo[] = LIFESTYLE_VIDEOS.map((v, i) => {
  const copy = LIFESTYLE_FEED_TITLES[v.id] ?? { title: v.inviteTitle, description: v.inviteSubtitle };
  return {
    id: `lifestyle-${v.id}`,
    type: "video" as const,
    title: copy.title,
    description: copy.description,
    category: "Investing" as const,
    videoId: v.id,
    localVideo: { uri: v.videoUri },
    durationMinutes: 1,
    pyramidLayer: 5 as const,
    likes: LIFESTYLE_LIKE_SEEDS[i] ?? 5000,
    saves: LIFESTYLE_SAVE_SEEDS[i] ?? 200,
  };
});

export const MOCK_FEED_DATA: FeedItem[] = [
  {
    id: "v1",
    type: "video",
    title: "למה שווה לך לחסוך עכשיו?",
    description: "איך ריבית דריבית עובדת ולמה הזמן הוא הנכס הכי יקר שלך.",
    category: "Saving",
    videoId: "placeholder-1",
    durationMinutes: 3,
    pyramidLayer: 1,
    likes: 4320,
    saves: 12,
    moduleId: "mod-1-1",
    moduleIndex: 0,
    chapterId: "chapter-1",
    storeChapterId: "ch-1",
  },
  {
    id: "q1",
    type: "quote",
    title: "חוק 50/30/20",
    quote: "חלק את ההכנסה שלך: 50% לצרכים, 30% לרצונות, ו-20% לחיסכון והשקעות.",
    category: "Budgeting",
    pyramidLayer: 1,
    likes: 342,
    saves: 85,
    moduleId: "mod-1-4",
    moduleIndex: 3,
    chapterId: "chapter-1",
    storeChapterId: "ch-1",
  },
  {
    id: "v2",
    type: "video",
    title: "מלכודת כרטיסי האשראי",
    description: "איך להימנע מחובות פלסטיק ומה באמת אומרת ריבית פיגורים.",
    category: "Debt",
    videoId: "placeholder-2",
    durationMinutes: 4,
    pyramidLayer: 2,
    likes: 6180,
    saves: 240,
    moduleId: "mod-1-3",
    moduleIndex: 2,
    chapterId: "chapter-1",
    storeChapterId: "ch-1",
  },
  {
    id: "q2",
    type: "quote",
    title: "השקעה בעצמך",
    quote: "ההשקעה הטובה ביותר שאתה יכול לעשות היא בעצמך. ידע משלם את הדיבידנדים הגבוהים ביותר.",
    author: "בנג'מין פרנקלין",
    category: "Investing",
    pyramidLayer: 2,
    likes: 560,
    saves: 120,
  },
  {
    id: "v3",
    type: "video",
    title: "קרן פנסיה, מה זה בכלל?",
    description: "כל מה שצריך לדעת על קרן הפנסיה שלך: מה נכנס, מה יוצא, ואיך לוודא שאתה לא מפסיד כסף.",
    category: "Investing",
    videoId: "placeholder-3",
    durationMinutes: 5,
    pyramidLayer: 3,
    likes: 3470,
    saves: 180,
    moduleId: "mod-2-12",
    moduleIndex: 3,
    chapterId: "chapter-2",
    storeChapterId: "ch-2",
  },
  {
    id: "q3",
    type: "quote",
    title: "וורן באפט על סיכון",
    quote: "כלל מספר 1: אל תפסיד כסף. כלל מספר 2: אל תשכח את כלל מספר 1.",
    author: "וורן באפט",
    category: "Investing",
    pyramidLayer: 3,
    likes: 891,
    saves: 234,
  },
  {
    id: "v4",
    type: "video",
    title: "תלוש שכר, מפענחים יחד",
    description: "ברוטו, נטו, ניכויים, ביטוח לאומי, מה כל השורות האלה אומרות ולאן הכסף שלך הולך.",
    category: "Budgeting",
    videoId: "placeholder-4",
    durationMinutes: 4,
    pyramidLayer: 1,
    likes: 5240,
    saves: 310,
    moduleId: "mod-1-5",
    moduleIndex: 4,
    chapterId: "chapter-1",
    storeChapterId: "ch-1",
  },
  {
    id: "q4",
    type: "quote",
    title: "כלל 72",
    quote: "חלק 72 בריבית השנתית שלך, וזה בדיוק כמה שנים לוקח לכסף שלך להכפיל את עצמו.",
    category: "Investing",
    pyramidLayer: 4,
    likes: 445,
    saves: 130,
    moduleId: "mod-1-1",
    moduleIndex: 0,
    chapterId: "chapter-1",
    storeChapterId: "ch-1",
  },
  {
    id: "v5",
    type: "video",
    title: "מינוס בעובר ושב, איך יוצאים?",
    description: "3 שלבים פשוטים לצאת מהמינוס ולא לחזור אליו. כולל טיפים שהבנק לא יגיד לך.",
    category: "Debt",
    videoId: "placeholder-5",
    durationMinutes: 6,
    pyramidLayer: 2,
    likes: 7120,
    saves: 420,
    moduleId: "mod-1-2",
    moduleIndex: 1,
    chapterId: "chapter-1",
    storeChapterId: "ch-1",
  },
  {
    id: "q5",
    type: "quote",
    title: "פיטר לינץ' על שוק המניות",
    quote: "הרבה יותר כסף אבד ממשקיעים שהתכוננו לתיקונים בשוק מאשר מהתיקונים עצמם.",
    author: "פיטר לינץ'",
    category: "Investing",
    pyramidLayer: 4,
    likes: 672,
    saves: 189,
  },
  {
    id: "v6",
    type: "video",
    title: "ביטוח, מה חייבים ומה מיותר?",
    description: "ביטוח חיים, בריאות, רכב, מה באמת שווה את הכסף ואיפה אפשר לחסוך בלי לקחת סיכון.",
    category: "Insurance",
    videoId: "placeholder-6",
    durationMinutes: 5,
    pyramidLayer: 2,
    likes: 2890,
    saves: 195,
    moduleId: "mod-2-14",
    moduleIndex: 5,
    chapterId: "chapter-2",
    storeChapterId: "ch-2",
  },
  {
    id: "q6",
    type: "quote",
    title: "על קרן חירום",
    quote: "קרן חירום היא לא הוצאה, היא הביטוח הכי זול שיש. 3 חודשי הוצאות בצד משנים הכל.",
    category: "Saving",
    pyramidLayer: 1,
    likes: 523,
    saves: 167,
    moduleId: "mod-1-9",
    moduleIndex: 8,
    chapterId: "chapter-1",
    storeChapterId: "ch-1",
  },
  {
    id: "v7",
    type: "video",
    title: "מדד ת\"א 35, להשקיע בישראל",
    description: "מה זה מדד מניות, למה כולם מדברים על מדד ת\"א 35, ואיך אפשר להיכנס בפחות מ-500 ₪.",
    category: "Investing",
    videoId: "placeholder-7",
    durationMinutes: 7,
    pyramidLayer: 4,
    likes: 8140,
    saves: 470,
  },
  {
    id: "q7",
    type: "quote",
    title: "ריבית דריבית, האינשטיין",
    quote: "ריבית דריבית היא הפלא השמיני של העולם. מי שמבין אותה, מרוויח. מי שלא, משלם.",
    author: "אלברט איינשטיין (מיוחס לו)",
    category: "Investing",
    pyramidLayer: 3,
    likes: 1203,
    saves: 445,
    moduleId: "mod-1-1",
    moduleIndex: 0,
    chapterId: "chapter-1",
    storeChapterId: "ch-1",
  },
  {
    id: "v8",
    type: "video",
    title: "מס הכנסה, זיכויים שמפספסים",
    description: "נקודות זיכוי, ניכויים, החזר מס, רוב האנשים משלמים יותר ממה שצריך. בוא נתקן את זה.",
    category: "Taxes",
    videoId: "placeholder-8",
    durationMinutes: 6,
    pyramidLayer: 3,
    likes: 4730,
    saves: 280,
    moduleId: "mod-2-11",
    moduleIndex: 2,
    chapterId: "chapter-2",
    storeChapterId: "ch-2",
  },
];
