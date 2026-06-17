/**
 * Energy (יחידות אנרגיה) — single source of truth for the purple battery
 * visual language. EVERY battery asset in the app (header pill, power-station
 * card meter, in-lesson bar, depletion modal, shop) MUST pull its colors + bolt
 * shape from here so the battery is pixel-consistent everywhere (Yoav:
 * "אחידות מלאה בנכסים של הבטריות"). Do NOT hard-code purple battery colors
 * anywhere else — import these.
 *
 * Signature color = PURPLE (deliberately distinct from the gold coins and the
 * sea-blue brand, so energy reads as its own addictive currency). Duolingo-style
 * rounded battery + white lightning bolt, in violet.
 */
export const ENERGY = {
  /** violet-400 — glow / highlight / charging shimmer */
  light: '#c084fc',
  /** violet-500 — gradient top (the "full" purple) */
  base: '#a855f7',
  /** violet-600 — gradient bottom / deep accent / border */
  deep: '#7c3aed',
  /** violet-100 — empty track behind the fill */
  track: '#ede9fe',
  /** the lightning bolt + battery shine */
  bolt: '#ffffff',
  /** glow color for shadows / GlowCard accent */
  glow: '#a855f7',
} as const;

/**
 * The lightning-bolt path, authored in a 100×84 viewBox (same box the battery
 * body uses). Shared so the bolt motif is identical on every battery asset.
 */
export const ENERGY_BOLT_PATH = 'M55 19 L31 49 L46 49 L43 65 L69 36 L53 36 Z';

/** Battery body geometry in the shared 100×84 viewBox. */
export const ENERGY_VIEWBOX = { w: 100, h: 84 } as const;