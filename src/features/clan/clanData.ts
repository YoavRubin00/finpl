import type {
  ClanChatMessage,
  DonationRequest,
  GroupBuyProject,
  ClanGoal,
} from './clanTypes';

// ===== LIMITS & CAPS =====

export const DAILY_DONATION_CAP_COINS = 50;
export const DAILY_DONATION_CAP_GEMS = 5;
export const MAX_DONATION_PER_TAP_COINS = 10;
export const MAX_DONATION_PER_TAP_GEMS = 1;
export const REP_PER_COIN = 1;
export const REP_PER_GEM = 10;
export const REP_THANK_BONUS = 5;
export const DONATION_REQUEST_TTL_HOURS = 24;
export const MAX_CHAT_MESSAGES = 200;
export const DONATE_COOLDOWN_MS = 60_000; // 60s between donations to same recipient

// ===== EXCHANGE RATES =====

export const FX_GEM_TO_COIN = 50;          // 1 gem = 50 coins (for goal contributions)
export const FX_FANTASY_CASH_TO_COIN = 0.001; // 1 FC = 0.001 coins

// ===== MOCK MEMBER IDs =====

export const SELF_ID = 'self';

export const MOCK_MEMBERS = [
  { id: SELF_ID,    name: 'את/ה',       avatar: '🦈', role: 'leader'  as const, xp: 1420, coins: 3800, reputation: 82 },
  { id: 'mem-001',  name: 'יונתן',      avatar: '🐺', role: 'deputy'  as const, xp: 1310, coins: 2200, reputation: 67 },
  { id: 'mem-002',  name: 'נועה',       avatar: '🦋', role: 'member'  as const, xp: 980,  coins: 1650, reputation: 44 },
  { id: 'mem-003',  name: 'אריאל',      avatar: '🦁', role: 'member'  as const, xp: 870,  coins: 1400, reputation: 38 },
  { id: 'mem-004',  name: 'מיכל',       avatar: '🐬', role: 'member'  as const, xp: 760,  coins: 990,  reputation: 31 },
  { id: 'mem-005',  name: 'עידו',       avatar: '🦊', role: 'member'  as const, xp: 620,  coins: 800,  reputation: 22 },
] as const;

export type ClanRole = 'leader' | 'deputy' | 'member';

export interface MockMember {
  id: string;
  name: string;
  avatar: string;
  role: ClanRole;
  xp: number;
  coins: number;
  reputation: number;
}

// ===== SEED CHAT MESSAGES =====

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

export const SEED_CHAT_MESSAGES: ClanChatMessage[] = [
  {
    kind: 'system',
    id: 'sys-001',
    sentAt: hoursAgo(48),
    event: 'member_joined',
    body: 'עידו הצטרף לקלאן! 🎉',
    payload: { memberId: 'mem-005' },
  },
  {
    kind: 'text',
    id: 'chat-001',
    sentAt: hoursAgo(24),
    authorId: 'mem-001',
    authorName: 'יונתן',
    authorAvatar: '🐺',
    body: 'שלום לכולם! בואו נדחוף את האסם השבוע 💪',
  },
  {
    kind: 'text',
    id: 'chat-002',
    sentAt: hoursAgo(23),
    authorId: 'mem-002',
    authorName: 'נועה',
    authorAvatar: '🦋',
    body: 'בסדר גמור! כמה XP צריך עוד?',
  },
  {
    kind: 'text',
    id: 'chat-003',
    sentAt: hoursAgo(22),
    authorId: SELF_ID,
    authorName: 'את/ה',
    authorAvatar: '🦈',
    body: 'עוד כ-500 XP ואנחנו בשכבת כסף 🥈',
  },
  {
    kind: 'system',
    id: 'sys-002',
    sentAt: hoursAgo(20),
    event: 'donation_sent',
    body: 'יונתן תרם 10 מטבעות לאריאל 🪙',
    payload: { memberId: 'mem-001', amount: 10, currency: 'coins' },
  },
  {
    kind: 'text',
    id: 'chat-004',
    sentAt: hoursAgo(18),
    authorId: 'mem-003',
    authorName: 'אריאל',
    authorAvatar: '🦁',
    body: 'תודה יונתן! מחזיר בקרוב 🙏',
  },
  {
    kind: 'text',
    id: 'chat-005',
    sentAt: hoursAgo(12),
    authorId: 'mem-004',
    authorName: 'מיכל',
    authorAvatar: '🐬',
    body: 'מישהו מוכן לדו-קרב? 🗡️',
  },
  {
    kind: 'text',
    id: 'chat-006',
    sentAt: hoursAgo(11),
    authorId: 'mem-001',
    authorName: 'יונתן',
    authorAvatar: '🐺',
    body: 'אני! בוא נלך 😤',
  },
  {
    kind: 'system',
    id: 'sys-003',
    sentAt: hoursAgo(8),
    event: 'group_buy_started',
    body: 'נפתחה קבוצת רכישה: קניון תל אביב 🏬',
    payload: { projectId: 'proj-001' },
  },
  {
    kind: 'text',
    id: 'chat-007',
    sentAt: hoursAgo(6),
    authorId: 'mem-002',
    authorName: 'נועה',
    authorAvatar: '🦋',
    body: 'מה ה-yield היומי על הקניון?',
  },
  {
    kind: 'text',
    id: 'chat-008',
    sentAt: hoursAgo(5),
    authorId: SELF_ID,
    authorName: 'את/ה',
    authorAvatar: '🦈',
    body: '50 מטבעות ו-2 ג\'מים ליום לכלל הקלאן 📈',
  },
  {
    kind: 'text',
    id: 'chat-009',
    sentAt: hoursAgo(2),
    authorId: 'mem-005',
    authorName: 'עידו',
    authorAvatar: '🦊',
    body: 'מצטרף לרכישה! 🙋',
  },
];

// ===== MOCK CHAT AUTO-REPLY POOL =====

export const MOCK_CHAT_LINES: string[] = [
  'אחלה! 🔥',
  'בוא נלך! 💪',
  'כל הכבוד לקלאן שלנו 🏆',
  'מתי האסם הבא נפתח?',
  'מישהו יודע כמה XP צריך לדרגה הבאה?',
  'יש למישהו gems פנויים? 💎',
  'הרוויחנו היום 🎯',
  'ביחד אנחנו מנצחים 🤝',
  'רואה את הלידרבורד? אנחנו במקום 3!',
  'צריך עוד מישהו לדו-קרב? ⚔️',
  'הרכישה המשותפת תשתלם בטוח 📊',
  'שלום לכולם 👋',
];

// ===== SEED DONATION REQUESTS =====

export const SEED_DONATION_REQUESTS: DonationRequest[] = [
  {
    id: 'req-001',
    requesterId: 'mem-002',
    requesterName: 'נועה',
    requesterAvatar: '🦋',
    currency: 'coins',
    amountRequested: 30,
    amountReceived: 10,
    createdAt: hoursAgo(3),
    expiresAt: new Date(Date.now() + 21 * 3_600_000).toISOString(),
    status: 'open',
    donorIds: ['mem-001'],
    note: 'צריכה מטבעות לשדרוג',
  },
  {
    id: 'req-002',
    requesterId: 'mem-004',
    requesterName: 'מיכל',
    requesterAvatar: '🐬',
    currency: 'gems',
    amountRequested: 3,
    amountReceived: 0,
    createdAt: hoursAgo(1),
    expiresAt: new Date(Date.now() + 23 * 3_600_000).toISOString(),
    status: 'open',
    donorIds: [],
    note: 'לקבוצת הרכישה',
  },
];

// ===== GROUP BUY PROJECT TEMPLATES =====

export interface ProjectTemplate {
  id: string;
  name: string;
  emoji: string;
  descriptionHebrew: string;
  goalAmount: number;
  goalCurrency: 'coins' | 'gems' | 'fantasyCash';
  dailyYieldCoins: number;
  dailyYieldGems: number;
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl-mall',
    name: 'קניון',
    emoji: '🏬',
    descriptionHebrew: 'קניון מסחרי עם עשרות חנויות — הכנסה קבועה מדמי שכירות',
    goalAmount: 1_000_000,
    goalCurrency: 'fantasyCash',
    dailyYieldCoins: 50,
    dailyYieldGems: 2,
  },
  {
    id: 'tpl-apartment',
    name: 'מגדל מגורים',
    emoji: '🏢',
    descriptionHebrew: 'מגדל 30 קומות בתל אביב — שכירות חודשית יציבה',
    goalAmount: 500_000,
    goalCurrency: 'fantasyCash',
    dailyYieldCoins: 30,
    dailyYieldGems: 1,
  },
  {
    id: 'tpl-restaurant',
    name: 'מסעדה',
    emoji: '🍽️',
    descriptionHebrew: 'מסעדה פופולרית במרכז העיר — תזרים יומי גבוה',
    goalAmount: 400_000,
    goalCurrency: 'fantasyCash',
    dailyYieldCoins: 25,
    dailyYieldGems: 1,
  },
  {
    id: 'tpl-goldcoin',
    name: 'מטבעת זהב',
    emoji: '🪙',
    descriptionHebrew: 'השקעה בזהב פיזי — ערך בטוח לטווח ארוך',
    goalAmount: 10_000,
    goalCurrency: 'coins',
    dailyYieldCoins: 15,
    dailyYieldGems: 0,
  },
];

// ===== SEED PROJECTS =====

export const SEED_PROJECTS: GroupBuyProject[] = [
  {
    id: 'proj-001',
    name: 'קניון תל אביב',
    emoji: '🏬',
    descriptionHebrew: 'קניון מסחרי עם עשרות חנויות — הכנסה קבועה מדמי שכירות',
    goalCurrency: 'fantasyCash',
    goalAmount: 1_000_000,
    raisedAmount: 312_000,
    status: 'active',
    startedAt: hoursAgo(8),
    dailyYieldCoins: 50,
    dailyYieldGems: 2,
    createdBy: SELF_ID,
    contributorIds: [SELF_ID, 'mem-001', 'mem-002', 'mem-005'],
  },
  {
    id: 'proj-002',
    name: 'מגדל מגורים',
    emoji: '🏢',
    descriptionHebrew: 'מגדל 30 קומות בתל אביב — שכירות חודשית יציבה',
    goalCurrency: 'fantasyCash',
    goalAmount: 500_000,
    raisedAmount: 500_000,
    status: 'funded',
    startedAt: hoursAgo(72),
    fundedAt: hoursAgo(24),
    dailyYieldCoins: 30,
    dailyYieldGems: 1,
    createdBy: 'mem-001',
    contributorIds: [SELF_ID, 'mem-001', 'mem-003', 'mem-004'],
  },
  {
    id: 'proj-003',
    name: 'מטבעת זהב',
    emoji: '🪙',
    descriptionHebrew: 'השקעה בזהב פיזי — ערך בטוח לטווח ארוך',
    goalCurrency: 'coins',
    goalAmount: 10_000,
    raisedAmount: 4_200,
    status: 'active',
    startedAt: hoursAgo(12),
    dailyYieldCoins: 15,
    dailyYieldGems: 0,
    createdBy: 'mem-002',
    contributorIds: [SELF_ID, 'mem-002', 'mem-005'],
  },
];

// ===== WEEKLY GOAL POOL =====

export const WEEKLY_GOAL_POOL: ClanGoal[] = [
  {
    id: 'goal-duels',
    kind: 'duels_won',
    labelHebrew: 'ניצחונות בדו-קרב',
    target: 10,
    rewardCoins: 200,
    rewardGems: 2,
    rewardChestPoints: 30,
  },
  {
    id: 'goal-xp',
    kind: 'xp_earned',
    labelHebrew: 'XP שנצבר',
    target: 2000,
    rewardCoins: 300,
    rewardGems: 3,
    rewardChestPoints: 40,
  },
  {
    id: 'goal-donations',
    kind: 'donations_made',
    labelHebrew: 'תרומות שנשלחו',
    target: 5,
    rewardCoins: 150,
    rewardGems: 1,
    rewardChestPoints: 20,
  },
  {
    id: 'goal-lessons',
    kind: 'lessons_completed',
    labelHebrew: 'שיעורים שהושלמו',
    target: 15,
    rewardCoins: 250,
    rewardGems: 2,
    rewardChestPoints: 35,
  },
];

/** Deterministically pick 3 goals for a given weekKey */
export function pickWeekGoals(weekKey: string): ClanGoal[] {
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    hash = (hash * 31 + weekKey.charCodeAt(i)) >>> 0;
  }
  const pool = [...WEEKLY_GOAL_POOL];
  const picked: ClanGoal[] = [];
  for (let i = 0; i < 3; i++) {
    const idx = (hash + i * 7) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}

/** Get current ISO week key "YYYY-Www" */
export function getCurrentWeekKey(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const dayOfYear = Math.floor((now.getTime() - jan4.getTime()) / 86400000);
  const week = Math.ceil((dayOfYear + jan4.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
