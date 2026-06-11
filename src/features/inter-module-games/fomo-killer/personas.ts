import type { Persona } from './types';

/**
 * Curated cast of "chat group" personas designed to emulate typical
 * pump-and-dump Telegram group participants.
 *
 * Suspicion gradient encoded in handles, emojis, and fake-verified flags —
 * users learn to read these signals over multiple sessions.
 */
export const PERSONAS: Persona[] = [
  {
    id: 'goldman-fake',
    handle: 'גולדמן_אנליסט_אמיתי',
    emoji: '💼',
    gradient: ['#1e3a8a', '#3b82f6'],
    fakeVerified: true,
  },
  {
    id: 'bitcoin-millionaire',
    handle: 'באפט_הישראלי',
    emoji: '💎',
    gradient: ['#92400e', '#fbbf24'],
    fakeVerified: true,
  },
  {
    id: 'etf-master',
    handle: 'מאסטר_קרנות_99',
    emoji: '📈',
    gradient: ['#581c87', '#a855f7'],
    fakeVerified: true,
  },
  {
    id: 'vip-admin',
    handle: 'מנהל_VIP_🔴שידור',
    emoji: '🔴',
    gradient: ['#7f1d1d', '#ef4444'],
    fakeVerified: true,
  },
  {
    id: 'tip-bot',
    handle: 'טיפ_היום_בוט',
    emoji: '🤖',
    gradient: ['#1e293b', '#64748b'],
    fakeVerified: true,
  },
  {
    id: 'shira',
    handle: 'שירה_משקיעה',
    emoji: '💃',
    gradient: ['#831843', '#ec4899'],
    fakeVerified: false,
  },
  {
    id: 'achi',
    handle: 'אחי_מהברסה',
    emoji: '🧢',
    gradient: ['#334155', '#94a3b8'],
    fakeVerified: false,
  },
  {
    id: 'chavera',
    handle: 'חברה_של_חברה',
    emoji: '👯',
    gradient: ['#115e59', '#14b8a6'],
    fakeVerified: false,
  },
];

const PERSONAS_BY_ID: Record<string, Persona> = PERSONAS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<string, Persona>,
);

export function getPersona(id: string): Persona {
  return PERSONAS_BY_ID[id] ?? PERSONAS[0];
}
