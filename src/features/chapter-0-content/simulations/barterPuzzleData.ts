/** Data for The Barter Puzzle simulation (mod-0-1). */

export interface Merchant {
  id: string;
  name: string;
  emoji: string;
  wants: string;
  wantsLabel: string;
  gives: string;
  givesLabel: string;
  rejectLine: string;
  acceptLine: string;
}

export interface BarterItem {
  emoji: string;
  label: string;
}

export type GamePhase =
  | 'intro'
  | 'reject'
  | 'swap1'
  | 'swap2'
  | 'payDebt'
  | 'coinDrop'
  | 'moneyPhase'
  | 'insight';

export const TARGET_MERCHANT: Merchant = {
  id: 'abu-hasan',
  name: 'אבו-חסן',
  emoji: '🧔',
  wants: '🐟',
  wantsLabel: 'דגים',
  gives: '',
  givesLabel: '',
  rejectLine: 'אני לא רוצה תרנגולות! אני צריך דגים 🐟',
  acceptLine: 'תודה רבה! בדיוק מה שרציתי 🐟',
};

export const SWAP_MERCHANTS: Merchant[] = [
  {
    id: 'francois',
    name: 'פרנסואה',
    emoji: '👨‍🌾',
    wants: '🐔',
    wantsLabel: 'תרנגולת',
    gives: '🪵',
    givesLabel: 'עצים',
    rejectLine: '',
    acceptLine: 'תרנגולת! בדיוק מה שחיפשתי 🐔',
  },
  {
    id: 'yossi',
    name: 'יוסי',
    emoji: '🎣',
    wants: '🪵',
    wantsLabel: 'עצים',
    gives: '🐟',
    givesLabel: 'דגים',
    rejectLine: '',
    acceptLine: 'עצים מעולים! קח דגים טריים 🐟',
  },
];

export const STARTING_ITEM: BarterItem = { emoji: '🐔', label: 'תרנגולת' };

export const COIN_ITEM: BarterItem = { emoji: '🪙', label: 'מטבע' };

export const FINN_COMMENT = 'וואו, 2 החלפות בשביל דבר אחד פשוט? 😮‍💨';

export const INSIGHT_TEXT =
  'כסף = הסכמה אוניברסלית.\nבמקום 2 החלפות, פעולה אחת.\nזו ההמצאה שפתרה הכל.';
