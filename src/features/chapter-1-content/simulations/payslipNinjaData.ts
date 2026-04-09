import type { PayslipItem, PayslipNinjaConfig } from './payslipNinjaTypes';

/* ------------------------------------------------------------------ */
/*  Payslip Items — Israeli payslip line items for classification      */
/* ------------------------------------------------------------------ */

const payslipItems: PayslipItem[] = [
    // --- Tax items (מיסים) ---
    {
        id: 'tax-1',
        label: 'מס הכנסה',
        emoji: '🏛️',
        category: 'tax',
        amount: 1_200,
    },
    {
        id: 'tax-2',
        label: 'ביטוח לאומי',
        emoji: '🛡️',
        category: 'tax',
        amount: 350,
    },
    {
        id: 'tax-3',
        label: 'מס בריאות',
        emoji: '🏥',
        category: 'tax',
        amount: 180,
    },
    {
        id: 'tax-4',
        label: 'מס ריווח הון',
        emoji: '📊',
        category: 'tax',
        amount: 90,
    },
    {
        id: 'tax-5',
        label: 'היטל עובדים זרים',
        emoji: '📋',
        category: 'tax',
        amount: 60,
    },

    // --- Pension / savings items (חיסכון) ---
    {
        id: 'pension-1',
        label: 'הפרשה לפנסיה (עובד)',
        emoji: '🏦',
        category: 'pension',
        amount: 600,
    },
    {
        id: 'pension-2',
        label: 'הפרשה לפנסיה (מעסיק)',
        emoji: '🤝',
        category: 'pension',
        amount: 650,
    },
    {
        id: 'pension-3',
        label: 'קרן השתלמות (עובד)',
        emoji: '🎓',
        category: 'pension',
        amount: 250,
    },
    {
        id: 'pension-4',
        label: 'קרן השתלמות (מעסיק)',
        emoji: '📚',
        category: 'pension',
        amount: 750,
    },
    {
        id: 'pension-5',
        label: 'ביטוח אובדן כושר עבודה',
        emoji: '🩺',
        category: 'pension',
        amount: 150,
    },

    // --- Net salary items (נטו) ---
    {
        id: 'net-1',
        label: 'שכר בסיס',
        emoji: '💵',
        category: 'net',
        amount: 8_000,
    },
    {
        id: 'net-2',
        label: 'דמי נסיעות',
        emoji: '🚌',
        category: 'net',
        amount: 500,
    },
    {
        id: 'net-3',
        label: 'דמי הבראה',
        emoji: '🏖️',
        category: 'net',
        amount: 378,
    },
    {
        id: 'net-4',
        label: 'שעות נוספות',
        emoji: '⏰',
        category: 'net',
        amount: 1_200,
    },
    {
        id: 'net-5',
        label: 'בונוס',
        emoji: '🎁',
        category: 'net',
        amount: 2_000,
    },
    {
        id: 'net-6',
        label: 'דמי חגים',
        emoji: '🕎',
        category: 'net',
        amount: 450,
    },
];

/* ------------------------------------------------------------------ */
/*  Game Configuration                                                 */
/* ------------------------------------------------------------------ */

export const payslipNinjaConfig: PayslipNinjaConfig = {
    items: payslipItems,
    timePerRound: 3_000,
    totalRounds: payslipItems.length,
};
