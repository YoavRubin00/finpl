/**
 * The registry of living diagrams (Yoav 13.11.2026): which lesson card gets
 * which diagram, kept apart from the big chapterNData.ts files so the lesson
 * content and the lesson flow can change without touching this, and the
 * other way round.
 *
 * How it attaches: LivingFlashcard calls `withLivingVisuals(cardId, segments)`.
 * Each entry names a card and an `anchor`: a few words that appear in exactly
 * one segment of that card. The diagram becomes that segment's visual (it
 * replaces a static illustration if the segment had one). If the anchor is
 * not found (the card's text was edited), nothing is attached and the card
 * renders exactly as its data says.
 *
 * NUMBERS: every figure below is taken from the card it sits on (or from the
 * card named in the comment). Nothing here is a new financial fact. Where a
 * diagram needs an amount the card does not state, it carries `example: true`
 * and shows a "לדוגמה" tag.
 */
import type { FlashcardSegment } from "../chapter-1-content/types";
import type { LivingSegment, LivingVisual } from "./livingTypes";

export interface LivingAttachment {
  cardId: string;
  /** Words that appear in the target segment's text (markup included, as written in the data). */
  anchor: string;
  visual: LivingVisual;
}

/** Lesson (module) id → the diagrams on its cards. */
export const LESSON_VISUALS: Record<string, LivingAttachment[]> = {
  // ───────────────────────── Chapter 0 ─────────────────────────

  // מושגי יסוד פיננסיים
  "mod-0-1": [
    {
      cardId: "fc-0-2-1",
      anchor: "חנות שמוכרת וקונה כסף",
      visual: {
        kind: "flow",
        a11y: "הכסף שאתם מפקידים עובר לבנק, והבנק מלווה אותו הלאה לאנשים אחרים.",
        caption: "הכסף שלכם לא נח בבנק. הוא יוצא משם כהלוואה",
        nodes: [
          { id: "you", label: "ההפקדה שלכם", icon: "wallet", tone: "cyan", col: 0, row: 0 },
          { id: "bank", label: "הבנק", icon: "bank", tone: "violet", col: 1, row: 0 },
          { id: "loan", label: "הלוואה לאחרים", icon: "handCoins", tone: "gold", col: 2, row: 0, badge: "check" },
        ],
        stages: [{ legs: [["you", "bank"]] }, { legs: [["bank", "loan"]], tone: "gold" }],
      },
    },
    {
      cardId: "fc-0-2-2",
      anchor: "זורם אליו",
      visual: {
        kind: "flow",
        a11y: "המשכורת נכנסת לחשבון העובר ושב, ומשם הכסף יוצא לחשמל ולפיצה.",
        caption: "כסף נכנס, כסף יוצא. העו\"ש הוא התחנה שבאמצע",
        nodes: [
          { id: "salary", label: "משכורת", icon: "briefcase", tone: "green", col: 0, row: 0.5 },
          { id: "osh", label: "העו\"ש", icon: "bank", tone: "cyan", col: 1, row: 0.5 },
          { id: "power", label: "חשמל", icon: "zap", tone: "gold", col: 2, row: 0 },
          { id: "pizza", label: "פיצה", icon: "pizza", tone: "gold", col: 2, row: 1 },
        ],
        stages: [
          { legs: [["salary", "osh"]], tone: "green" },
          { legs: [["osh", "power"], ["osh", "pizza"]], tone: "gold" },
        ],
      },
    },
  ],

  // מושגי יסוד פיננסיים, המשך
  "mod-0-1b": [
    {
      cardId: "fc-0-2-4",
      anchor: "תשלומים בקליק",
      visual: {
        kind: "flow",
        a11y: "קנייה בתשלומים בקליק היא הלוואה, ועל הלוואה משלמים ריבית גבוהה.",
        caption: "פריסה בקליק היא הלוואה, והיא עולה כסף",
        nodes: [
          { id: "buy", label: "תשלומים בקליק", icon: "cart", tone: "cyan", col: 0, row: 0 },
          { id: "loan", label: "הלוואה", icon: "handCoins", tone: "violet", col: 1, row: 0 },
          { id: "interest", label: "ריבית גבוהה", icon: "percent", tone: "red", col: 2, row: 0, badge: "alert" },
        ],
        stages: [{ legs: [["buy", "loan"]], tone: "violet" }, { legs: [["loan", "interest"]], tone: "red" }],
      },
    },
    {
      // Figures: this card's own split (6% + 6.5% + 6% = 18.5%).
      cardId: "fc-0-2-5",
      anchor: "אוטומטית בכל חודש",
      visual: {
        kind: "flow",
        a11y: "שישה אחוזים מהמשכורת שלכם, שישה וחצי אחוזים תגמולים מהמעסיק ושישה אחוזים פיצויים מהמעסיק נכנסים יחד לקרן הפנסיה: שמונה עשר וחצי אחוזים מהשכר.",
        caption: "פנסיית חובה בישראל: ‏18.5% מהשכר נכנסים לקרן מדי חודש",
        nodes: [
          { id: "you", label: "מהמשכורת שלכם", short: "אתם", icon: "user", tone: "cyan", col: 0, row: 0, amount: { values: [6], suffix: "%" } },
          { id: "emp", label: "תגמולי מעסיק", short: "מעסיק", icon: "building", tone: "violet", col: 0, row: 1, amount: { values: [6.5], suffix: "%" } },
          { id: "sev", label: "פיצויים", icon: "shield", tone: "gold", col: 0, row: 2, amount: { values: [6], suffix: "%" } },
          { id: "fund", label: "קרן הפנסיה", short: "הקרן", icon: "piggy", tone: "green", col: 1, row: 1, amount: { values: [6, 12.5, 18.5], suffix: "%" }, badge: "check" },
        ],
        stages: [{ legs: [["you", "fund"], ["emp", "fund"], ["sev", "fund"]], staggerMs: 520, tone: "green" }],
      },
    },
  ],

  // מה זה בכלל כסף?
  "mod-0-2": [
    {
      // Goods named on fc-0-1-1 (תפוחי אדמה, נעליים) and fc-0-1-4 (קפה, חולצה).
      cardId: "fc-0-1-2",
      anchor: "המצאת הכסף",
      visual: {
        kind: "flow",
        a11y: "מוכרים תפוחי אדמה ומקבלים כסף, ובכסף אפשר לקנות נעליים, קפה או חולצה.",
        caption: "מוכרים דבר אחד, מקבלים כסף, קונים כל דבר",
        nodes: [
          { id: "goods", label: "תפוחי אדמה", icon: "wheat", tone: "green", col: 0, row: 1 },
          { id: "money", label: "כסף", icon: "coins", tone: "gold", col: 1, row: 1 },
          { id: "shoes", label: "נעליים", icon: "shoe", tone: "cyan", col: 2, row: 0, badge: "check" },
          { id: "coffee", label: "קפה", icon: "coffee", tone: "cyan", col: 2, row: 1, badge: "check" },
          { id: "shirt", label: "חולצה", icon: "shirt", tone: "cyan", col: 2, row: 2, badge: "check" },
        ],
        stages: [
          { legs: [["goods", "money"]], tone: "gold" },
          { legs: [["money", "shoes"], ["money", "coffee"], ["money", "shirt"]] },
        ],
        // Short stage: two of the three goods, in two rows.
        compact: {
          nodes: [
            { id: "goods", label: "תפוחי אדמה", icon: "wheat", tone: "green", col: 0, row: 0.5 },
            { id: "money", label: "כסף", icon: "coins", tone: "gold", col: 1, row: 0.5 },
            { id: "shoes", label: "נעליים", icon: "shoe", tone: "cyan", col: 2, row: 0, badge: "check" },
            { id: "coffee", label: "קפה", icon: "coffee", tone: "cyan", col: 2, row: 1, badge: "check" },
          ],
          stages: [{ legs: [["goods", "money"]], tone: "gold" }, { legs: [["money", "shoes"], ["money", "coffee"]] }],
        },
      },
    },
  ],

  // הגנב השקוף: אינפלציה
  "mod-0-3": [
    {
      // An illustration (tagged "לדוגמה"): the card states the idea without a figure.
      cardId: "fc-0-3-1",
      anchor: "ממה שיכול היה לקנות אתמול",
      visual: {
        kind: "erosion",
        a11y: "אותו שטר של מאה שקלים: המחיר עולה, ומתוך עשרה מוצרים בסל נשארים שמונה.",
        caption: "אותו שטר בדיוק, פחות מוצרים בסל",
        noteLabel: "₪100",
        items: 10,
        lost: 2,
        priceLabel: "המחיר עולה",
        basketLabel: "מה שנכנס לסל",
        example: true,
      },
    },
  ],

  // כמה נכנס וכמה יוצא
  "mod-0-4": [
    {
      cardId: "fc-0-4-1",
      anchor: "הכנסות: כל כסף",
      visual: {
        kind: "flow",
        a11y: "משכורת, מתנות ומלגות נכנסות כולן לאותו כיס: שלכם.",
        caption: "כמה מקורות, כיס אחד",
        nodes: [
          { id: "salary", label: "משכורת", icon: "briefcase", tone: "cyan", col: 0, row: 0 },
          { id: "gifts", label: "מתנות לחג", icon: "gift", tone: "violet", col: 0, row: 1 },
          { id: "grant", label: "מלגות", icon: "graduation", tone: "gold", col: 0, row: 2 },
          { id: "you", label: "הכיס שלכם", icon: "wallet", tone: "green", col: 1, row: 1, badge: "check" },
        ],
        stages: [{ legs: [["salary", "you"], ["gifts", "you"], ["grant", "you"]], staggerMs: 420, tone: "green" }],
      },
    },
    {
      // Figures: this card's own bars (נכנס ₪6,000, יצא ₪5,000, ההפרש ₪1,000).
      cardId: "fc-0-4-3",
      anchor: "נשארתם בפלוס",
      visual: {
        kind: "flow",
        a11y: "נכנסו ששת אלפים שקלים, יצאו חמשת אלפים, ואלף שקלים נשארו: זה החיסכון.",
        caption: "מה שלא יצא נשאר אצלכם. זה החיסכון",
        nodes: [
          { id: "in", label: "נכנס", icon: "wallet", tone: "cyan", col: 0, row: 0.5, amount: { values: [6000], prefix: "₪" } },
          { id: "out", label: "יצא", icon: "cart", tone: "gold", col: 1, row: 0, amount: { values: [5000], prefix: "₪" }, ring: 5 / 6 },
          { id: "left", label: "נשאר", icon: "piggy", tone: "green", col: 1, row: 1, amount: { values: [1000], prefix: "₪" }, ring: 1 / 6, badge: "check" },
        ],
        stages: [{ legs: [["in", "out"]], tone: "gold" }, { legs: [["in", "left"]], tone: "green" }],
      },
    },
  ],

  // אז למה להשקיע?
  "mod-0-5": [
    {
      cardId: "fc-0-5-2",
      anchor: "נטיעת הכספים",
      visual: {
        kind: "flow",
        a11y: "הכסף שלכם מושקע במניות, בריבית בנקאית או בנדל\"ן, וחוזר אליכם כתשואה.",
        caption: "שמים את הכסף לעבוד, והוא מחזיר תשואה",
        shark: "happy",
        nodes: [
          { id: "money", label: "הכסף שלכם", icon: "coins", tone: "gold", col: 0, row: 1 },
          { id: "stocks", label: "מניות", icon: "chart", tone: "cyan", col: 1, row: 0 },
          { id: "bank", label: "ריבית בנקאית", icon: "bank", tone: "cyan", col: 1, row: 1 },
          { id: "estate", label: "נדל\"ן", icon: "house", tone: "cyan", col: 1, row: 2 },
          { id: "yield", label: "תשואה", icon: "trendUp", tone: "green", col: 2, row: 1, badge: "check" },
        ],
        stages: [
          { legs: [["money", "stocks"], ["money", "bank"], ["money", "estate"]] },
          { legs: [["stocks", "yield"], ["bank", "yield"], ["estate", "yield"]], tone: "green", staggerMs: 200 },
        ],
        // Short stage: two of the three places to invest, in two rows.
        compact: {
          nodes: [
            { id: "money", label: "הכסף שלכם", icon: "coins", tone: "gold", col: 0, row: 0.5 },
            { id: "stocks", label: "מניות", icon: "chart", tone: "cyan", col: 1, row: 0 },
            { id: "estate", label: "נדל\"ן", icon: "house", tone: "cyan", col: 1, row: 1 },
            { id: "yield", label: "תשואה", icon: "trendUp", tone: "green", col: 2, row: 0.5, badge: "check" },
          ],
          stages: [
            { legs: [["money", "stocks"], ["money", "estate"]] },
            { legs: [["stocks", "yield"], ["estate", "yield"]], tone: "green", staggerMs: 200 },
          ],
        },
      },
    },
  ],

  // ───────────────────────── Chapter 1 ─────────────────────────

  // ריבית דריבית
  "mod-1-1": [
    {
      // Figures: this card's own curve (₪100 ב-5%: 100, 105, 110, 116). The profit of each
      // year is the difference between two neighbouring points (5, 5, 6).
      cardId: "fc-1-4-1",
      anchor: "קרן ההשקעה המקורית",
      visual: {
        kind: "flow",
        a11y: "מאה שקלים בתשואה של חמישה אחוזים: הרווח של כל שנה חוזר לקרן, והקרן גדלה ממאה למאה וחמש, למאה ועשר ולמאה ושש עשרה.",
        caption: "₪100 בתשואה של 5%: הרווח חוזר לקרן, ומרוויח בעצמו",
        shark: "happy",
        nodes: [
          { id: "base", label: "הקרן", icon: "coins", tone: "gold", col: 0, row: 0, amount: { values: [100, 105, 110, 116], prefix: "₪", fromStart: true }, badge: "check" },
          { id: "gain", label: "הרווח של השנה", icon: "sprout", tone: "green", col: 1, row: 0, amount: { values: [5, 5, 6], prefix: "+₪" } },
        ],
        stages: [
          { legs: [["base", "gain"]], tone: "green", hopMs: 560, token: "dot" },
          { legs: [["gain", "base"]], tone: "gold", hopMs: 560 },
          { legs: [["base", "gain"]], tone: "green", hopMs: 560, token: "dot" },
          { legs: [["gain", "base"]], tone: "gold", hopMs: 560 },
          { legs: [["base", "gain"]], tone: "green", hopMs: 560, token: "dot" },
          { legs: [["gain", "base"]], tone: "gold", hopMs: 560 },
        ],
      },
    },
  ],

  // מלכודת המינוס
  "mod-1-2-img": [
    {
      // Figures: this card's own curve (מינוס ₪10,000 ב-15%: 10,000, 11,500, 13,225, 15,209).
      // The interest of each year is the difference between two neighbouring points.
      cardId: "fc-1-2-5",
      anchor: "מצטרפת לקרן החוב",
      visual: {
        kind: "flow",
        a11y: "מינוס של עשרת אלפים שקלים בריבית של חמישה עשר אחוזים: הריבית מצטרפת לחוב, והחוב גדל לאחד עשר אלף וחמש מאות, לשלושה עשר אלף מאתיים עשרים וחמישה ולחמישה עשר אלף מאתיים ותשעה.",
        caption: "מינוס של ₪10,000 בריבית 15%: הריבית מצטרפת לחוב, וגדלה איתו",
        shark: "empathic",
        nodes: [
          { id: "debt", label: "החוב", icon: "trendDown", tone: "red", col: 0, row: 0, amount: { values: [10000, 11500, 13225, 15209], prefix: "₪", fromStart: true }, badge: "alert" },
          { id: "interest", label: "הריבית של השנה", icon: "percent", tone: "gold", col: 1, row: 0, amount: { values: [1500, 1725, 1984], prefix: "+₪" } },
        ],
        stages: [
          { legs: [["debt", "interest"]], tone: "gold", hopMs: 560, token: "dot" },
          { legs: [["interest", "debt"]], tone: "red", hopMs: 560 },
          { legs: [["debt", "interest"]], tone: "gold", hopMs: 560, token: "dot" },
          { legs: [["interest", "debt"]], tone: "red", hopMs: 560 },
          { legs: [["debt", "interest"]], tone: "gold", hopMs: 560, token: "dot" },
          { legs: [["interest", "debt"]], tone: "red", hopMs: 560 },
        ],
      },
    },
  ],

  // אשראי
  "mod-1-3": [
    {
      cardId: "fc-1-3-2",
      anchor: "דחיית חלק מהחיוב החודשי",
      visual: {
        kind: "flow",
        a11y: "מהחיוב החודשי חלק משולם, והחלק שנדחה עובר לחודש הבא עם ריבית.",
        caption: "מה שלא שולם החודש עובר הלאה, עם ריבית",
        nodes: [
          { id: "bill", label: "החיוב החודשי", short: "החיוב", icon: "receipt", tone: "cyan", col: 0, row: 0.5 },
          { id: "paid", label: "שולם החודש", short: "שולם", icon: "wallet", tone: "green", col: 1, row: 0, badge: "check" },
          { id: "rolled", label: "נדחה, עם ריבית", short: "נדחה", icon: "repeat", tone: "red", col: 1, row: 1, badge: "alert" },
        ],
        stages: [{ legs: [["bill", "paid"]], tone: "green" }, { legs: [["bill", "rolled"]], tone: "red" }],
      },
    },
  ],

  // תזרים ותקציב
  "mod-1-4-img": [
    {
      // Figures: the 50/30/20 rule as stated on fc-1-1-2, fc-1-1-3 and this card.
      cardId: "fc-1-1-5",
      anchor: "תשלום לעצמך תחילה",
      visual: {
        kind: "flow",
        a11y: "כשהמשכורת נכנסת, עשרים אחוזים יוצאים קודם לחיסכון, ורק אחר כך חמישים אחוזים לצרכים ושלושים אחוזים לרצונות.",
        caption: "קודם החיסכון יוצא, ורק אחר כך כל השאר",
        nodes: [
          { id: "salary", label: "המשכורת", short: "משכורת", icon: "briefcase", tone: "cyan", col: 0, row: 1 },
          { id: "save", label: "חיסכון", icon: "piggy", tone: "green", col: 1, row: 0, amount: { values: [20], suffix: "%" }, ring: 0.2, badge: "check" },
          { id: "needs", label: "צרכים", icon: "house", tone: "violet", col: 1, row: 1, amount: { values: [50], suffix: "%" }, ring: 0.5 },
          { id: "wants", label: "רצונות", icon: "bag", tone: "gold", col: 1, row: 2, amount: { values: [30], suffix: "%" }, ring: 0.3 },
        ],
        stages: [
          { legs: [["salary", "save"]], tone: "green", holdMs: 380 },
          { legs: [["salary", "needs"], ["salary", "wants"]], tone: "cyan" },
        ],
      },
    },
  ],

  // לקרוא תלוש שכר
  "mod-1-5": [
    {
      // Figures: this card's own split of a ₪10,000 gross (נטו 82%, and 6% each for income tax,
      // national insurance + health, pension). 6% of ₪10,000 is ₪600; the net is the card's "כ-₪8,200".
      cardId: "fc-1-5-2",
      anchor: "המדרגות נעות",
      visual: {
        kind: "flow",
        a11y: "מברוטו של עשרת אלפים שקלים יורדים כשש מאות שקלים מס הכנסה, כשש מאות ביטוח לאומי ובריאות וכשש מאות פנסיה, ונשארים כשמונת אלפים ומאתיים שקלים נטו.",
        caption: "ברוטו ₪10,000 (2026, בלי נקודות זיכוי נוספות): כ-₪8,200 נטו",
        nodes: [
          { id: "gross", label: "ברוטו", icon: "briefcase", tone: "cyan", col: 0, row: 0, labelAbove: true, amount: { values: [10000], prefix: "₪" } },
          { id: "net", label: "נטו", icon: "wallet", tone: "green", col: 2, row: 0, labelAbove: true, amount: { values: [8200], prefix: "~₪" }, ring: 0.82, badge: "check" },
          { id: "tax", label: "מס הכנסה", icon: "receipt", tone: "red", col: 0, row: 1, amount: { values: [600], prefix: "~₪" }, ring: 0.06 },
          { id: "ni", label: "לאומי ובריאות", icon: "health", tone: "gold", col: 1, row: 1, amount: { values: [600], prefix: "~₪" }, ring: 0.06 },
          { id: "pension", label: "פנסיה", icon: "piggy", tone: "violet", col: 2, row: 1, amount: { values: [600], prefix: "~₪" }, ring: 0.06 },
        ],
        stages: [
          { legs: [["gross", "tax"], ["gross", "ni"], ["gross", "pension"]], route: "v", tone: "red", staggerMs: 260 },
          { legs: [["gross", "net"]], tone: "green" },
        ],
        // Short stage: the same five nodes and figures in two columns (labels beside the nodes).
        compact: {
          nodes: [
            { id: "gross", label: "ברוטו", icon: "briefcase", tone: "cyan", col: 0, row: 0, amount: { values: [10000], prefix: "₪" } },
            { id: "net", label: "נטו", icon: "wallet", tone: "green", col: 0, row: 2, amount: { values: [8200], prefix: "~₪" }, ring: 0.82, badge: "check" },
            { id: "tax", label: "מס הכנסה", short: "מס", icon: "receipt", tone: "red", col: 1, row: 0, amount: { values: [600], prefix: "~₪" }, ring: 0.06 },
            { id: "ni", label: "לאומי ובריאות", short: "לאומי", icon: "health", tone: "gold", col: 1, row: 1, amount: { values: [600], prefix: "~₪" }, ring: 0.06 },
            { id: "pension", label: "פנסיה", icon: "piggy", tone: "violet", col: 1, row: 2, amount: { values: [600], prefix: "~₪" }, ring: 0.06 },
          ],
          stages: [
            { legs: [["gross", "tax"], ["gross", "ni"], ["gross", "pension"]], tone: "red", staggerMs: 260 },
            { legs: [["gross", "net"]], route: "v", tone: "green" },
          ],
        },
      },
    },
  ],

  // הלוואות צרכניות
  "mod-1-6": [
    {
      cardId: "fc-1-6-1",
      anchor: "המבחן לפני כל הלוואה",
      visual: {
        kind: "flow",
        a11y: "אותה הלוואה יכולה לקנות נכס שמייצר כסף, או מוצר מתכלה ששוחק את העושר.",
        caption: "אותה הלוואה, שתי תוצאות. השאלה היא מה קונים איתה",
        nodes: [
          { id: "loan", label: "הלוואה", icon: "handCoins", tone: "cyan", col: 0, row: 0.5 },
          { id: "asset", label: "נכס שמייצר כסף", short: "מייצר כסף", icon: "sprout", tone: "green", col: 1, row: 0, badge: "check" },
          { id: "stuff", label: "מוצר מתכלה", icon: "bag", tone: "red", col: 1, row: 1, badge: "alert" },
        ],
        stages: [{ legs: [["loan", "stuff"]], tone: "red" }, { legs: [["loan", "asset"]], tone: "green" }],
      },
    },
  ],

  // עמלות
  "mod-1-7": [
    {
      cardId: "fc-1-7-1",
      anchor: "עמלות תפעוליות",
      visual: {
        kind: "flow",
        a11y: "לבנק שני מנועי רווח: מרווח הריבית והעמלות. שניהם מגיעים לאותו מקום, רווח הבנק.",
        caption: "שני מנועים, יעד אחד: הרווח של הבנק",
        nodes: [
          { id: "spread", label: "מרווח ריבית", icon: "percent", tone: "cyan", col: 0, row: 0 },
          { id: "fees", label: "עמלות", icon: "receipt", tone: "violet", col: 0, row: 1 },
          { id: "bank", label: "רווח הבנק", icon: "bank", tone: "gold", col: 1, row: 0.5, badge: "check" },
        ],
        stages: [{ legs: [["spread", "bank"], ["fees", "bank"]], staggerMs: 480, tone: "gold" }],
      },
    },
  ],

  // מלכודות שיווקיות
  "mod-1-8": [
    {
      // Figures: this card's own example (עוגן של ₪500, מחיר של ₪200).
      cardId: "fc-1-8-2",
      anchor: "ליד עוגן של",
      visual: {
        kind: "flow",
        a11y: "מחיר מחוק של חמש מאות שקלים נתקע בראש כעוגן, ולידו מחיר של מאתיים שקלים מרגיש כמו מציאה.",
        caption: "המספר הראשון קובע איך ירגיש השני",
        nodes: [
          { id: "old", label: "המחיר המחוק", icon: "tag", tone: "violet", col: 0, row: 0, amount: { values: [500], prefix: "₪" } },
          { id: "anchor", label: "העוגן בראש", icon: "anchor", tone: "cyan", col: 1, row: 0 },
          { id: "deal", label: "מרגיש מציאה", icon: "bag", tone: "red", col: 2, row: 0, amount: { values: [200], prefix: "₪" }, badge: "alert" },
        ],
        stages: [{ legs: [["old", "anchor"]], token: "dot" }, { legs: [["anchor", "deal"]], tone: "red", token: "dot" }],
      },
    },
  ],

  // קרן חירום
  "mod-1-9": [
    {
      cardId: "fc-1-9-4",
      anchor: "כשהדוד מתפוצץ",
      visual: {
        kind: "flow",
        a11y: "תקלה דחופה: עם קרן חירום משלמים וממשיכים, ובלי קרן הפתרון הוא הלוואה בריבית גבוהה.",
        caption: "עם קרן בצד, תקלה נשארת תקלה. בלי קרן, היא הופכת לחוב",
        nodes: [
          { id: "hit", label: "תקלה דחופה", icon: "wrench", tone: "gold", col: 0, row: 0.5 },
          { id: "debt", label: "הלוואה יקרה", icon: "percent", tone: "red", col: 1, row: 1, badge: "alert" },
          { id: "fund", label: "קרן חירום", icon: "shield", tone: "green", col: 1, row: 0, badge: "check" },
        ],
        stages: [{ legs: [["hit", "debt"]], tone: "red" }, { legs: [["hit", "fund"]], tone: "green" }],
      },
    },
  ],

  // השכר הראשון
  "mod-1-10": [
    {
      cardId: "fc-1-10-1",
      anchor: "השכר הראשון הוא",
      visual: {
        kind: "flow",
        a11y: "השכר הראשון הוא העוגן: כל העלאה מחושבת מהשכר שלפניה.",
        caption: "כל העלאה מחושבת מהשכר שלפניה. הראשון קובע את הכיוון",
        nodes: [
          { id: "first", label: "השכר הראשון", icon: "anchor", tone: "cyan", col: 0, row: 0 },
          { id: "raise1", label: "העלאה", icon: "trendUp", tone: "green", col: 1, row: 0 },
          { id: "raise2", label: "ההעלאה הבאה", icon: "trendUp", tone: "green", col: 2, row: 0, badge: "check" },
        ],
        stages: [{ legs: [["first", "raise1"]], tone: "green" }, { legs: [["raise1", "raise2"]], tone: "green" }],
      },
    },
    {
      // Figures: this card's own text and bars (ביטוח לאומי מעסיק 7.6% על החלק מעל ₪7,703,
      // פנסיה 6.5%, פיצויים 6%).
      cardId: "fc-1-10-3",
      anchor: "הגודל האמיתי של העסקה",
      visual: {
        kind: "flow",
        a11y: "מעל הברוטו המעסיק מוסיף ביטוח לאומי של שבעה נקודה שישה אחוזים על החלק שמעל שבעת אלפים שבע מאות ושלושה שקלים, פנסיה של שישה וחצי אחוזים ופיצויים של שישה אחוזים. הכול יחד הוא עלות המעסיק.",
        caption: "מה המעסיק מוסיף מעל הברוטו (2026). ביטוח לאומי: 7.6% על החלק שמעל ₪7,703",
        nodes: [
          { id: "ni", label: "ביטוח לאומי", icon: "health", tone: "gold", col: 0, row: 0, labelAbove: true, amount: { values: [7.6], suffix: "%" } },
          { id: "pension", label: "פנסיה", icon: "piggy", tone: "violet", col: 1, row: 0, labelAbove: true, amount: { values: [6.5], suffix: "%" } },
          { id: "sev", label: "פיצויים", icon: "shield", tone: "green", col: 2, row: 0, labelAbove: true, amount: { values: [6], suffix: "%" } },
          { id: "gross", label: "הברוטו שלכם", icon: "briefcase", tone: "cyan", col: 0, row: 1 },
          { id: "cost", label: "עלות מעסיק", icon: "building", tone: "violet", col: 2, row: 1, badge: "check" },
        ],
        stages: [
          { legs: [["gross", "cost"]] },
          { legs: [["sev", "cost"], ["pension", "cost"], ["ni", "cost"]], route: "v", tone: "violet", staggerMs: 300 },
        ],
        // Short stage: the same five nodes and figures in two columns (labels beside the nodes).
        compact: {
          nodes: [
            { id: "gross", label: "הברוטו שלכם", short: "ברוטו", icon: "briefcase", tone: "cyan", col: 0, row: 0 },
            { id: "cost", label: "עלות מעסיק", icon: "building", tone: "violet", col: 0, row: 2, badge: "check" },
            { id: "ni", label: "ביטוח לאומי", short: "לאומי", icon: "health", tone: "gold", col: 1, row: 0, amount: { values: [7.6], suffix: "%" } },
            { id: "pension", label: "פנסיה", icon: "piggy", tone: "violet", col: 1, row: 1, amount: { values: [6.5], suffix: "%" } },
            { id: "sev", label: "פיצויים", icon: "shield", tone: "green", col: 1, row: 2, amount: { values: [6], suffix: "%" } },
          ],
          stages: [
            { legs: [["gross", "cost"]], route: "v" },
            { legs: [["ni", "cost"], ["pension", "cost"], ["sev", "cost"]], tone: "violet", staggerMs: 300 },
          ],
        },
      },
    },
  ],

  // ───────────────────── Later chapters: key ideas ─────────────────────

  // פנסיה
  "mod-2-12": [
    {
      cardId: "fc-2-12-2",
      anchor: "מתפצלות לשניים",
      visual: {
        kind: "flow",
        // Only what this card says: the employer's contributions split in two,
        // תגמולים (for your pension allowance) and פיצויים. Where they are kept is not shown.
        a11y: "הפרשות המעסיק מתפצלות לשניים: תגמולים, לקצבה שלכם, ופיצויים.",
        caption: "הפרשות המעסיק מתפצלות לשניים: תגמולים לקצבה, ופיצויים",
        nodes: [
          { id: "emp", label: "הפרשות המעסיק", short: "המעסיק", icon: "building", tone: "cyan", col: 0, row: 0.5 },
          { id: "tag", label: "תגמולים", icon: "piggy", tone: "violet", col: 1, row: 0 },
          { id: "sev", label: "פיצויים", icon: "shield", tone: "gold", col: 1, row: 1 },
        ],
        stages: [{ legs: [["emp", "tag"]], tone: "violet" }, { legs: [["emp", "sev"]], tone: "gold" }],
      },
    },
  ],

  // שוק ההון
  "mod-4-19": [
    {
      cardId: "fc-4-19-2",
      anchor: "תזרים מזומנים",
      visual: {
        kind: "flow",
        a11y: "באגרת חוב אתם מלווים כסף למדינה או לחברה, ומקבלים בחזרה את הקרן בתוספת ריבית.",
        caption: "אג\"ח: מלווים כסף, ומקבלים אותו בחזרה עם ריבית",
        nodes: [
          { id: "lend", label: "ההלוואה שלכם", icon: "banknote", tone: "cyan", col: 0, row: 0 },
          { id: "issuer", label: "מדינה או חברה", icon: "building", tone: "violet", col: 1, row: 0 },
          { id: "back", label: "קרן + ריבית", icon: "coins", tone: "green", col: 2, row: 0, badge: "check" },
        ],
        stages: [{ legs: [["lend", "issuer"]] }, { legs: [["issuer", "back"]], tone: "green" }],
      },
    },
  ],

  // תעודות סל, ETF
  "mod-4-21": [
    {
      cardId: "fc-4-21-1",
      anchor: "היא עוקבת אחרי",
      visual: {
        kind: "flow",
        a11y: "קנייה אחת של קרן סל מפזרת את הכסף שלכם בין הרבה חברות.",
        caption: "קנייה אחת, חשיפה להמון חברות",
        nodes: [
          { id: "you", label: "קנייה אחת", icon: "wallet", tone: "cyan", col: 0, row: 1 },
          { id: "etf", label: "ETF", icon: "package", tone: "violet", col: 1, row: 1 },
          { id: "c1", label: "חברה", icon: "building", tone: "green", col: 2, row: 0, badge: "check" },
          { id: "c2", label: "חברה", icon: "building", tone: "green", col: 2, row: 1, badge: "check" },
          { id: "c3", label: "ועוד אלפים", icon: "globe", tone: "green", col: 2, row: 2, badge: "check" },
        ],
        stages: [
          { legs: [["you", "etf"]], tone: "violet" },
          { legs: [["etf", "c1"], ["etf", "c2"], ["etf", "c3"]], tone: "green" },
        ],
        // Short stage: two rows.
        compact: {
          nodes: [
            { id: "you", label: "קנייה אחת", icon: "wallet", tone: "cyan", col: 0, row: 0.5 },
            { id: "etf", label: "ETF", icon: "package", tone: "violet", col: 1, row: 0.5 },
            { id: "c1", label: "חברה", icon: "building", tone: "green", col: 2, row: 0, badge: "check" },
            { id: "c3", label: "ועוד אלפים", icon: "globe", tone: "green", col: 2, row: 1, badge: "check" },
          ],
          stages: [{ legs: [["you", "etf"]], tone: "violet" }, { legs: [["etf", "c1"], ["etf", "c3"]], tone: "green" }],
        },
      },
    },
  ],

  // דיבידנד
  "mod-4-23": [
    {
      cardId: "fc-4-23-1",
      anchor: "מניית דיבידנד היא כמו",
      visual: {
        kind: "flow",
        a11y: "מניית דיבידנד מחזירה לכם בשתי דרכים: עליית ערך ודיבידנד רבעוני.",
        caption: "שתי דרכים שבהן מניה מחזירה לכם",
        nodes: [
          { id: "stock", label: "המניה שלכם", icon: "chart", tone: "cyan", col: 0, row: 0.5 },
          { id: "rise", label: "עליית ערך", icon: "trendUp", tone: "violet", col: 1, row: 0 },
          { id: "div", label: "דיבידנד רבעוני", icon: "coins", tone: "gold", col: 1, row: 1 },
          { id: "you", label: "אתם", icon: "wallet", tone: "green", col: 2, row: 0.5, badge: "check" },
        ],
        stages: [
          { legs: [["stock", "rise"], ["stock", "div"]] },
          { legs: [["rise", "you"], ["div", "you"]], tone: "green", staggerMs: 240 },
        ],
      },
    },
  ],

  // פיזור וניהול סיכונים
  "mod-4-24": [
    {
      // Figures: this card's own example split (מניות עולמיות 60%, אג"ח 30%, מזומן 10%),
      // which the card itself calls "דוגמה".
      cardId: "fc-4-24-1",
      anchor: "ארוחת החינם",
      visual: {
        kind: "flow",
        // No verdict on any part: no check and no alert. The stocks node only bobs
        // (it is the part that moves most), in the same neutral colour family as the rest.
        a11y: "הכסף מתחלק בין מניות עולמיות, אגרות חוב ומזומן. חלק אחד זז יותר מהאחרים, והתמהיל כולו נשאר יציב יותר.",
        caption: "חלק אחד זז יותר, התמהיל יציב",
        example: true,
        nodes: [
          { id: "money", label: "הכסף שלכם", icon: "coins", tone: "gold", col: 0, row: 1 },
          { id: "stocks", label: "מניות עולמיות", short: "מניות", icon: "chart", tone: "violet", col: 1, row: 0, amount: { values: [60], suffix: "%" }, ring: 0.6, swing: true },
          { id: "bonds", label: "אג\"ח", icon: "shield", tone: "cyan", col: 1, row: 1, amount: { values: [30], suffix: "%" }, ring: 0.3 },
          { id: "cash", label: "מזומן", icon: "banknote", tone: "green", col: 1, row: 2, amount: { values: [10], suffix: "%" }, ring: 0.1 },
        ],
        stages: [{ legs: [["money", "stocks"], ["money", "bonds"], ["money", "cash"]], staggerMs: 260 }],
      },
    },
  ],

  // יציאה לחופש כלכלי
  "mod-5-25": [
    {
      cardId: "fc-5-25-1",
      anchor: "העבודה היא",
      visual: {
        kind: "flow",
        a11y: "הנכסים שלכם מייצרים תשואה, והתשואה מכסה את כל הוצאות המחיה.",
        caption: "כשהתשואה מכסה את ההוצאות, העבודה הופכת לבחירה",
        shark: "happy",
        nodes: [
          { id: "assets", label: "הנכסים שלכם", icon: "chart", tone: "cyan", col: 0, row: 0 },
          { id: "yield", label: "תשואה", icon: "coins", tone: "gold", col: 1, row: 0 },
          { id: "life", label: "הוצאות המחיה", icon: "house", tone: "green", col: 2, row: 0, badge: "check" },
        ],
        stages: [{ legs: [["assets", "yield"]], tone: "gold" }, { legs: [["yield", "life"]], tone: "green" }],
      },
    },
  ],
};

/** cardId → its attachments (card ids are unique across the lesson data). */
const BY_CARD: Record<string, LivingAttachment[]> = {};
for (const list of Object.values(LESSON_VISUALS)) {
  for (const attachment of list) {
    (BY_CARD[attachment.cardId] ??= []).push(attachment);
  }
}

/** Every attachment with its lesson id, for the gallery and for audits. */
export function listLivingAttachments(): Array<LivingAttachment & { lessonId: string }> {
  const out: Array<LivingAttachment & { lessonId: string }> = [];
  for (const [lessonId, list] of Object.entries(LESSON_VISUALS)) {
    for (const attachment of list) out.push({ ...attachment, lessonId });
  }
  return out;
}

/**
 * A card's segments with its living diagrams attached. Returns the same
 * array when the card has none, so memoised callers do not re-render.
 */
export function withLivingVisuals(cardId: string, segments: FlashcardSegment[]): LivingSegment[] {
  const attachments = BY_CARD[cardId];
  if (!attachments || attachments.length === 0) return segments;
  let out: LivingSegment[] | null = null;
  for (const attachment of attachments) {
    const index = segments.findIndex((segment) => segment.text.includes(attachment.anchor));
    if (index < 0) continue;
    out ??= segments.slice();
    out[index] = { ...out[index], visual: attachment.visual };
  }
  return out ?? segments;
}
