import type { FomoMessage } from './types';

/**
 * Template pool for a FOMO Killer session. Each session samples 10 messages
 * with a target category mix: ~60% scam-category (hype/authority/urgency),
 * ~25% noise, ~15% bait-truth. Seed shuffle is done in the main card.
 *
 * Content is inspired by patterns documented in SEC's 2023 report on
 * pump-and-dump activity in Telegram/Discord groups. No real tickers used —
 * all refer to a fictional "$MOON" to avoid legal exposure.
 */
export const FOMO_MESSAGES: FomoMessage[] = [
  // ─── Hype (report as spam) ───────────────────────────────
  {
    id: 'hype-1',
    personaId: 'vip-admin',
    category: 'hype',
    content: '🚀🚀🚀 $MOON עלה +340% השבוע!! זה רק ההתחלה!! מי בפנים?? 🔥🔥',
  },
  {
    id: 'hype-2',
    personaId: 'bitcoin-millionaire',
    category: 'hype',
    content: '💎💎💎 אל תפספסו. $MOON הולכת ל-×10 עד סוף החודש. FOMO אמיתי 🚀',
  },
  {
    id: 'hype-3',
    personaId: 'tip-bot',
    category: 'hype',
    content: '🔔 התראת סיגנל: פריצה של $MOON אושרה. יעד 1: +50%, יעד 2: +120% 🎯',
  },
  {
    id: 'hype-4',
    personaId: 'vip-admin',
    category: 'hype',
    content: '⚡ כל מי שלא קונה עכשיו, יבכה מחר. זה המהלך של 2026 🔥🔥🔥',
  },

  // ─── Fake authority (report as spam) ─────────────────────
  {
    id: 'auth-1',
    personaId: 'goldman-fake',
    category: 'fake-authority',
    content: 'קיבלתי לפני רגע סקירה פנימית מחברים בגולדמן. $MOON בכיוון של פי 8 ברבעון. פנימי בלבד.',
  },
  {
    id: 'auth-2',
    personaId: 'etf-master',
    category: 'fake-authority',
    content: 'אחרי 15 שנה בשוק, זה הסיגנל הכי ברור שראיתי. 94% דיוק במודל שלי. $MOON = קנייה.',
    hasFakeScreenshot: true,
  },
  {
    id: 'auth-3',
    personaId: 'tip-bot',
    category: 'fake-authority',
    content: 'מודל בינה מלאכותית v3.2: יעד מחיר ל-$MOON: 847$. רמת ביטחון: 97.3%. סיכון: נמוך. 📊',
  },

  // ─── Urgency (report as spam) ────────────────────────────
  {
    id: 'urg-1',
    personaId: 'vip-admin',
    category: 'urgency',
    content: '⏰ רק 10 דקות לפני הברייקאאוט הגדול! אחרי זה המחיר יברח. עכשיו או אף פעם!',
  },
  {
    id: 'urg-2',
    personaId: 'bitcoin-millionaire',
    category: 'urgency',
    content: '🚨 התשתית של $MOON עומדת להשתחרר עוד שעה. מי שלא בפנים עד אז, לא יספיק.',
  },
  {
    id: 'urg-3',
    personaId: 'etf-master',
    category: 'urgency',
    content: 'חלון ההזדמנות נסגר מחר ב-9:30. אני נכנס עם 50K עכשיו. לא אחכה.',
  },

  // ─── Social proof (ignore, not spam, just peer pressure) ─
  {
    id: 'soc-1',
    personaId: 'achi',
    category: 'social-proof',
    content: 'אחי לא תאמין. שמתי 5K אתמול ב-$MOON, היום יש לי 14K 🤯 ממש מטורף',
    hasFakeScreenshot: true,
  },
  {
    id: 'soc-2',
    personaId: 'shira',
    category: 'social-proof',
    content: 'נכנסתי לפני שבועיים עם 2K. הפכתי ל-8K 💃 מי שעוד לא בפנים, על מה אתם מחכים?',
  },
  {
    id: 'soc-3',
    personaId: 'chavera',
    category: 'social-proof',
    content: 'כל הקבוצה כבר בפנים. אני, אחותי, שותפה שלי לעבודה. רק אתה עוד לא? 🤷‍♀️',
  },
  {
    id: 'soc-4',
    personaId: 'achi',
    category: 'social-proof',
    content: 'אמא שלי (!!) הרוויחה 8,000 ₪ ב-$MOON החודש. אם היא הצליחה, כל אחד יכול.',
  },

  // ─── Noise (ignore, harmless chat) ──────────────────────
  {
    id: 'noise-1',
    personaId: 'chavera',
    category: 'noise',
    content: 'מישהו יודע איפה אפשר לקנות את הכובע של המשקיעים? ראיתי במם השבוע 😂',
  },
  {
    id: 'noise-2',
    personaId: 'shira',
    category: 'noise',
    content: 'יצא מישהו חדש מתחנת דלק בצומת גלילות? יש תור על חולני.',
  },
  {
    id: 'noise-3',
    personaId: 'achi',
    category: 'noise',
    content: 'אגב מי מצליח לפתוח את האפליקציה של הבנק? אצלי קורסת מהבוקר.',
  },

  // ─── Bait-truth (ignore, seems like good advice, but engaging = noise) ─
  {
    id: 'bait-1',
    personaId: 'chavera',
    category: 'bait-truth',
    content: 'אולי כדאי לצאת ברווח לפני שזה מתהפך? סתם הרהור.',
  },
  {
    id: 'bait-2',
    personaId: 'achi',
    category: 'bait-truth',
    content: 'משהו לא מרגיש לי בסדר פה. יותר מדי התלהבות.',
  },
  {
    id: 'bait-3',
    personaId: 'shira',
    category: 'bait-truth',
    content: 'רק שאלה, למה אף אחד לא מדבר על הסיכון? זה מוזר קצת.',
  },
];

/**
 * Draw N messages from the pool. Targets the category mix:
 * ~6 scam (hype/authority/urgency), ~2 social-proof, ~1 noise, ~1 bait-truth.
 */
export function sampleSession(n: number, seed: number): FomoMessage[] {
  const rng = makeRng(seed);
  const pickFrom = (cat: string, count: number): FomoMessage[] => {
    const pool = FOMO_MESSAGES.filter((m) => m.category === cat);
    return shuffle(pool, rng).slice(0, count);
  };

  const picks = [
    ...pickFrom('hype', 2),
    ...pickFrom('fake-authority', 2),
    ...pickFrom('urgency', 2),
    ...pickFrom('social-proof', 2),
    ...pickFrom('noise', 1),
    ...pickFrom('bait-truth', 1),
  ];

  return shuffle(picks, rng).slice(0, n);
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
