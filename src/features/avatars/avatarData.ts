export interface AvatarDefinition {
  id: string;
  emoji: string;
  lottieSource?: number;
  name: string;
  gemCost: number;
}

export const AVATAR_LIST: AvatarDefinition[] = [
  // Free avatars
  { id: 'lion', emoji: '🦁', name: 'הלוחם', gemCost: 0 },
  { id: 'fox', emoji: '🦊', name: 'החכם', gemCost: 0 },
  { id: 'wolf', emoji: '🐺', name: 'הצייד', gemCost: 0 },
  { id: 'eagle', emoji: '🦅', name: 'החזון', gemCost: 0 },
  { id: 'dolphin', emoji: '🐬', name: 'החברותי', gemCost: 0 },
  { id: 'turtle', emoji: '🐢', name: 'הסבלני', gemCost: 0 },
  { id: 'panda', emoji: '🐼', name: 'הרגוע', gemCost: 0 },
  { id: 'cat', emoji: '🐱', name: 'הסקרן', gemCost: 0 },
  // Premium avatars
  { id: 'koala', emoji: '🐨', name: 'הישנוני', gemCost: 30 },
  { id: 'dragon', emoji: '🐲', name: 'הדרקון', gemCost: 120 },
  { id: 'phoenix', emoji: '🔥', name: 'הפניקס', gemCost: 150 },
  { id: 'rocket', emoji: '🚀', name: 'האסטרונאוט', gemCost: 200, lottieSource: require('../../../assets/lottie/wired-flat-489-rocket-space-hover-flying.json') as number },
  { id: 'king', emoji: '👑', name: 'המלוכה', gemCost: 50, lottieSource: require('../../../assets/lottie/Crown.json') as number },
  { id: 'robot', emoji: '🤖', name: 'FinBot AI', gemCost: 75, lottieSource: require('../../../assets/lottie/wired-flat-746-technology-integrated-circuits-hover-pinch.json') as number },
  { id: 'unicorn', emoji: '🦄', name: 'הנדיר', gemCost: 100 },
  { id: 'diamond', emoji: '💎', name: 'הפרימיום', gemCost: 150, lottieSource: require('../../../assets/lottie/Diamond.json') as number },
];

export const FREE_AVATARS = AVATAR_LIST.filter((a) => a.gemCost === 0);
export const PREMIUM_AVATARS = AVATAR_LIST.filter((a) => a.gemCost > 0);

export const DEFAULT_AVATAR_EMOJI = '🎮';

export function getAvatarById(id: string | null): AvatarDefinition | undefined {
  if (!id) return undefined;
  return AVATAR_LIST.find((a) => a.id === id);
}
