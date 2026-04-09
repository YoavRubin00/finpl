import type { SwipeCard, MinusTrapSwipeConfig } from './minusTrapTypes';

/* ------------------------------------------------------------------ */
/*  10 Swipe Cards — מלכודת המינוס (טינדר הוצאות)                      */
/*  Order: salary first → mixed wants/needs/traps → income at end      */
/* ------------------------------------------------------------------ */

const cards: SwipeCard[] = [
    // ── 1. משכורת נכנסה! ──
    {
        id: 'mt-16',
        title: 'משכורת נכנסה!',
        emoji: '💰',
        amount: 4500,
        cardType: 'income',
        isMandatory: false,
    },
    // ── 2. חשבון חשמל ──
    {
        id: 'mt-8',
        title: 'חשבון חשמל',
        emoji: '⚡',
        amount: -400,
        cardType: 'need',
        isMandatory: true,
        skipPenalty: 450,
        penaltyDelay: 2,
    },
    // ── 3. סושי מ-Wolt ב-23:00 ──
    {
        id: 'mt-1',
        title: 'סושי מ-Wolt ב-23:00',
        emoji: '🍣',
        amount: -150,
        cardType: 'want',
        isMandatory: false,
    },
    // ── 4. אייפון 16 ב-36 תשלומים ──
    {
        id: 'mt-13',
        title: 'אייפון 16 ב-36 תשלומים',
        emoji: '📱',
        amount: -150,
        cardType: 'trap',
        isMandatory: false,
        recurringCost: 150,
    },
    // ── 5. שכר דירה ──
    {
        id: 'mt-9',
        title: 'שכר דירה',
        emoji: '🏠',
        amount: -2800,
        cardType: 'need',
        isMandatory: true,
        skipPenalty: 99999,
        penaltyDelay: 0,
    },
    // ── 6. הלוואה חוץ-בנקאית — "ריבית אפסית" ──
    {
        id: 'mt-14',
        title: 'הלוואה חוץ-בנקאית — "ריבית אפסית"',
        emoji: '💸',
        amount: 2000,
        cardType: 'trap',
        isMandatory: false,
        recurringCost: 200,
    },
    // ── 7. החתול בלע לגו — חדר מיון ──
    {
        id: 'mt-12',
        title: 'החתול בלע לגו — חדר מיון',
        emoji: '🐱',
        amount: -600,
        cardType: 'need',
        isMandatory: true,
        skipPenalty: 600,
        penaltyDelay: 0,
    },
    // ── 8. קונסולת PS5 במבצע ──
    {
        id: 'mt-5',
        title: 'קונסולת PS5 במבצע',
        emoji: '🎮',
        amount: -1200,
        cardType: 'want',
        isMandatory: false,
    },
    // ── 9. מנוי חדר כושר שנתי ──
    {
        id: 'mt-4',
        title: 'מנוי חדר כושר שנתי',
        emoji: '💪',
        amount: -250,
        cardType: 'want',
        isMandatory: false,
    },
    // ── 10. החזר מס הכנסה ──
    {
        id: 'mt-18',
        title: 'החזר מס הכנסה',
        emoji: '📄',
        amount: 800,
        cardType: 'income',
        isMandatory: false,
    },
];

export const minusTrapSwipeConfig: MinusTrapSwipeConfig = {
    startingBalance: 3000,
    gameOverThreshold: -5000,
    overdraftInterestRate: 0.05,
    cards,
};
