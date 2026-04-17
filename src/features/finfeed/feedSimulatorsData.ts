export interface FeedSimulator {
  id: string;
  simulatorKey: string;
  moduleId: string;
  storeChapterId: string;
  chapterId: string;
  moduleIndex: number;
  moduleTitle: string;
  chapterName: string;
  teaserTitle: string;
  teaserSub: string;
  accentColor: string;
}

export const FEED_SIMULATORS: ReadonlyArray<FeedSimulator> = [
  {
    id: "feed-sim-inflation-thief",
    simulatorKey: "mod-0-3",
    moduleId: "mod-0-3",
    storeChapterId: "ch-0",
    chapterId: "chapter-0",
    moduleIndex: 2,
    moduleTitle: "הגנב השקוף: אינפלציה",
    chapterName: "פרק 0 — הכניסה לעולם הפיננסי",
    teaserTitle: "הגנב השקוף",
    teaserSub: 'גלו איך האינפלציה "גונבת" מהחיסכון שלכם בלי שתרגישו',
    accentColor: "#22d3ee",
  },
  {
    id: "feed-sim-compound",
    simulatorKey: "mod-1-1",
    moduleId: "mod-1-1",
    storeChapterId: "ch-1",
    chapterId: "chapter-1",
    moduleIndex: 0,
    moduleTitle: "ריבית דריבית",
    chapterName: "פרק 1 — יסודות",
    teaserTitle: "כוח הריבית דריבית",
    teaserSub: "כמה כסף יהיה לכם בעוד 20 שנה? הכלי שכל חוסך חייב להכיר",
    accentColor: "#22d3ee",
  },
  {
    id: "feed-sim-tax-puzzle",
    simulatorKey: "mod-2-11",
    moduleId: "mod-2-11",
    storeChapterId: "ch-2",
    chapterId: "chapter-2",
    moduleIndex: 1,
    moduleTitle: "נקודות זיכוי",
    chapterName: "פרק 2 — ביטחון",
    teaserTitle: "חידת המס",
    teaserSub: "כמה מס אתם משלמים? פתרו את החידה וגלו אם אתם משלמים יותר מדי",
    accentColor: "#38bdf8",
  },
  {
    id: "feed-sim-inflation-race",
    simulatorKey: "mod-3-15",
    moduleId: "mod-3-15",
    storeChapterId: "ch-3",
    chapterId: "chapter-3",
    moduleIndex: 0,
    moduleTitle: "אינפלציה",
    chapterName: "פרק 3 — יציבות",
    teaserTitle: "ריצת האינפלציה",
    teaserSub: "מה קורה לכסף שלכם כשהאינפלציה גבוהה? ריצה אינטראקטיבית",
    accentColor: "#60a5fa",
  },
  {
    id: "feed-sim-risk-slider",
    simulatorKey: "mod-4-19",
    moduleId: "mod-4-19",
    storeChapterId: "ch-4",
    chapterId: "chapter-4",
    moduleIndex: 0,
    moduleTitle: "שוק ההון",
    chapterName: "פרק 4 — צמיחה",
    teaserTitle: "מחוון הסיכון",
    teaserSub: "כמה סיכון אתם מוכנים לקחת? גלו את פרופיל הסיכון שלכם בשניות",
    accentColor: "#818cf8",
  },
  {
    id: "feed-sim-chart-reader",
    simulatorKey: "mod-4-28",
    moduleId: "mod-4-28",
    storeChapterId: "ch-4",
    chapterId: "chapter-4",
    moduleIndex: 9,
    moduleTitle: "ניתוח גרפים",
    chapterName: "פרק 4 — צמיחה",
    teaserTitle: "קורא גרפים",
    teaserSub: "מצא דפוסים בגרף שוק ההון ותנצחו את האתגר",
    accentColor: "#818cf8",
  },
  {
    id: "feed-sim-ira-builder",
    simulatorKey: "mod-5-31",
    moduleId: "mod-5-31",
    storeChapterId: "ch-5",
    chapterId: "chapter-5",
    moduleIndex: 6,
    moduleTitle: "תיק IRA",
    chapterName: "פרק 5 — הדרך לחופש כלכלי",
    teaserTitle: "בונה ה-IRA",
    teaserSub: "סמלצו את הדרך לפנסיה — כמה תצטרכו ומתי תגיעו לשם",
    accentColor: "#22d3ee",
  },
];
