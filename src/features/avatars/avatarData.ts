export interface AvatarDefinition {
  id: string;
  emoji: string;
  /** Public URL of avatar image (PNG with circular alpha). When set, prefer over emoji.
   *  Reserved for future remote-served avatars; the new Pip set renders via inline SVG instead. */
  imageUrl?: string;
  lottieSource?: number;
  name: string;
  gemCost: number;
}

export const AVATAR_LIST: AvatarDefinition[] = [
  // Free avatars (emoji-only)
  { id: 'lion', emoji: '🦁', name: 'הלוחם', gemCost: 0 },
  { id: 'fox', emoji: '🦊', name: 'החכם', gemCost: 0 },
  { id: 'wolf', emoji: '🐺', name: 'הצייד', gemCost: 0 },
  { id: 'eagle', emoji: '🦅', name: 'החזון', gemCost: 0 },
  { id: 'dolphin', emoji: '🐬', name: 'החברותי', gemCost: 0 },
  { id: 'turtle', emoji: '🐢', name: 'הסבלני', gemCost: 0 },
  { id: 'panda', emoji: '🐼', name: 'הרגוע', gemCost: 0 },
  { id: 'cat', emoji: '🐱', name: 'הסקרן', gemCost: 0 },
  // Premium Pip avatars (rendered via SVG in AvatarImage; emoji is fallback only).
  // IDs are kept identical to shop item IDs (`avatar-*`) so a single ID flows
  // shop → ownedAvatars → setAvatar → AvatarImage.getAvatarSvgIcon().
  { id: 'avatar-saver',        emoji: '🪙', name: 'החוסך',         gemCost: 50 },
  { id: 'avatar-learner',      emoji: '📚', name: 'הלומד',         gemCost: 80 },
  { id: 'avatar-grower',       emoji: '🌱', name: 'המגדל',         gemCost: 120 },
  { id: 'avatar-strong-saver', emoji: '🐷', name: 'החוסך החזק',    gemCost: 180 },
  { id: 'avatar-analyst',      emoji: '📊', name: 'המנתח',         gemCost: 250 },
  { id: 'avatar-investor',     emoji: '🚀', name: 'המשקיע',        gemCost: 350 },
  { id: 'avatar-trader',       emoji: '📈', name: 'הסוחר',         gemCost: 500 },
  { id: 'avatar-defender',     emoji: '🛡️', name: 'המגן',          gemCost: 700 },
  { id: 'avatar-explorer',     emoji: '🌍', name: 'החוקר',         gemCost: 1000 },
  { id: 'avatar-strategist',   emoji: '♟️', name: 'האסטרטג',       gemCost: 1500 },
];

// Backward-compat: existing users may have old premium IDs persisted in their profile
// (legacy shark series + earlier Disney-style names). Map them to the new Pip equivalents
// chosen by closest archetype, NOT just by gem tier — so an existing user sees a
// thematically similar avatar after upgrade.
const LEGACY_AVATAR_ALIASES: Record<string, string> = {
  // legacy shark series (PNG-backed)
  scholar:  'avatar-learner',
  saver:    'avatar-saver',
  analyst:  'avatar-analyst',
  piggy:    'avatar-strong-saver',
  investor: 'avatar-investor',
  earner:   'avatar-trader',
  trader:   'avatar-trader',
  banker:   'avatar-strategist',
  // even older Disney-style ids
  koala:    'avatar-learner',
  king:     'avatar-saver',
  robot:    'avatar-analyst',
  unicorn:  'avatar-strong-saver',
  dragon:   'avatar-investor',
  phoenix:  'avatar-trader',
  diamond:  'avatar-defender',
  rocket:   'avatar-strategist',
};

export const FREE_AVATARS = AVATAR_LIST.filter((a) => a.gemCost === 0);
export const PREMIUM_AVATARS = AVATAR_LIST.filter((a) => a.gemCost > 0);

export const DEFAULT_AVATAR_EMOJI = '🎮';

export function getAvatarById(id: string | null): AvatarDefinition | undefined {
  if (!id) return undefined;
  const resolvedId = LEGACY_AVATAR_ALIASES[id] ?? id;
  return AVATAR_LIST.find((a) => a.id === resolvedId);
}
