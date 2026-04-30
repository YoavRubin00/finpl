export interface AvatarDefinition {
  id: string;
  emoji: string;
  /** Public URL of avatar image (PNG with circular alpha). When set, prefer over emoji. */
  imageUrl?: string;
  lottieSource?: number;
  name: string;
  gemCost: number;
}

const BLOB_BASE = "https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/images/avatars";

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
  // Premium Captain Shark avatars (image-based, sold in shop)
  { id: 'scholar', emoji: '🦈', name: 'הלומד', gemCost: 50, imageUrl: `${BLOB_BASE}/scholar.png` },
  { id: 'saver', emoji: '🦈', name: 'החוסך', gemCost: 100, imageUrl: `${BLOB_BASE}/saver.png` },
  { id: 'analyst', emoji: '🦈', name: 'המנתח', gemCost: 150, imageUrl: `${BLOB_BASE}/analyst.png` },
  { id: 'piggy', emoji: '🦈', name: 'החוסך החזק', gemCost: 250, imageUrl: `${BLOB_BASE}/piggy.png` },
  { id: 'investor', emoji: '🦈', name: 'המשקיע', gemCost: 400, imageUrl: `${BLOB_BASE}/investor.png` },
  { id: 'earner', emoji: '🦈', name: 'המרוויח', gemCost: 600, imageUrl: `${BLOB_BASE}/earner.png` },
  { id: 'trader', emoji: '🦈', name: 'הסוחר', gemCost: 800, imageUrl: `${BLOB_BASE}/trader.png` },
  { id: 'banker', emoji: '🦈', name: 'הבנקאי', gemCost: 1200, imageUrl: `${BLOB_BASE}/banker.png` },
];

// Backward-compat: existing users may have old premium IDs persisted in their profile.
// Map them to the new shark equivalents (matched by gemCost tier).
const LEGACY_AVATAR_ALIASES: Record<string, string> = {
  koala: 'scholar',   // 50  → 50
  king: 'saver',      // 100 → 100
  robot: 'analyst',   // 150 → 150
  unicorn: 'piggy',   // 250 → 250
  dragon: 'investor', // 400 → 400
  phoenix: 'earner',  // 600 → 600
  diamond: 'trader',  // 800 → 800
  rocket: 'banker',   // 1200 → 1200
};

export const FREE_AVATARS = AVATAR_LIST.filter((a) => a.gemCost === 0);
export const PREMIUM_AVATARS = AVATAR_LIST.filter((a) => a.gemCost > 0);

export const DEFAULT_AVATAR_EMOJI = '🎮';

export function getAvatarById(id: string | null): AvatarDefinition | undefined {
  if (!id) return undefined;
  const resolvedId = LEGACY_AVATAR_ALIASES[id] ?? id;
  return AVATAR_LIST.find((a) => a.id === resolvedId);
}
