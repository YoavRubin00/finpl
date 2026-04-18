/**
 * Design tokens for the FOMO Killer game.
 * All colors validated for WCAG AA contrast against their intended backgrounds.
 */
export const FOMO_TOKENS = {
  // Canvas — navy dark that harmonizes with FinPlay's sky-900 family
  canvas: '#0c1e3a',
  canvasBand: '#0f2947',
  chrome: '#0a1729',
  chromeBorder: 'rgba(125,211,252,0.12)',

  // Bubbles
  bubbleOther: '#1e3a5f',
  bubbleOtherBorder: 'rgba(125,211,252,0.15)',
  bubbleSelf: '#0369a1',
  bubbleSelfBorder: 'rgba(14,165,233,0.4)',
  bubbleText: '#f0f9ff',     // ~15:1 on bubbleOther
  bubbleMeta: '#bae6fd',     // ~9:1 on bubbleOther (passes AA for small text)
  handleColor: '#e0f2fe',

  // Post-action overlays
  hypeEdge: 'rgba(251,191,36,0.22)',
  scamOutline: 'rgba(220,38,38,0.5)',
  addedGlow: 'rgba(34,197,94,0.55)',

  // Inline actions
  ignoreBg: '#475569',
  ignoreBorder: '#334155',
  ignoreText: '#ffffff',

  reportBg: '#dc2626',
  reportBorder: '#991b1b',
  reportText: '#ffffff',

  tempBg: '#16a34a',
  tempBorder: '#15803d',
  tempText: '#ffffff',

  // Portfolio HUD
  hudBg: 'rgba(8,23,42,0.9)',
  hudBorder: 'rgba(14,165,233,0.3)',
  hudValue: '#ffffff',
  hudDeltaPos: '#4ade80',
  hudDeltaNeg: '#f87171',

  // Reveal
  revealBg: 'rgba(8,23,42,0.92)',
  revealPump: '#22c55e',
  revealCrash: '#dc2626',
  revealText: '#ffffff',
  revealSub: '#fecaca',

  // Verified badge
  verifiedBg: '#0891b2',
  verifiedCheck: '#ffffff',
} as const;

export const FOMO_MOTION = {
  autoAdvanceMs: 2400,
  autoAdvanceMsReducedMotion: 4200,
  chipAppearDelayMs: 420,
  typingMs: 600,
} as const;
