import type { WisdomQuote } from './types';
import rawQuotes from './finplay_quotes_updated.json';


const CATEGORY_ICON: Record<string, string> = {
    'השקעות': '🏦',
    'טווח ארוך': '🌳',
    'חינוך פיננסי': '📚',
    'מיינדסט': '🧠',
    'חיסכון': '💰',
    'סבלנות': '⏳',
    'מוטיבציה פיננסית': '💪',
    'מוטיבציה פיןפליי': '🎮',
};

/** 50 financial wisdom quotes (finplay_quotes_updated.json) */
export const wisdomQuotes: WisdomQuote[] = rawQuotes.map((q) => ({
    id: `nq-${q.id}`,
    text: q.quote,
    author: q.author,
    authorRole: q.about_author,
    icon: CATEGORY_ICON[q.category] ?? '💡',
    type: 'quote',
}));
