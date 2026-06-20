import type { Topic } from './types';
import { TOPIC_ICONS } from './topic-icons';

/**
 * Per-module in-app CAROUSEL — a swipeable set of branded slides (the same
 * Instagram edu-carousel, MINUS its download/CTA slide, since in the app the
 * user is already playing). Slides are cloud-hosted (Vercel Blob) and loaded at
 * runtime, so they can be swapped without an EAS rebuild. Surfaced as a bonus
 * topic-tree chip that opens an in-app sheet; NOT a learning topic — excluded
 * from the completion math (Yoav 2026-06-21). Add-only: register a module here.
 */
export interface CarouselSlide {
  /** Cloud image URL (Vercel Blob). Loaded via toProxiedImageUri at render. */
  uri: string;
  /** Accessibility label — the slide's headline as plain text (the image
   *  itself carries baked Hebrew that a screen reader can't read). */
  alt: string;
}

export interface ModuleCarousel {
  /** Hebrew sheet title shown at the top of the carousel. */
  titleHe: string;
  slides: CarouselSlide[];
}

const BLOB = 'https://8mnwcjygpqev3keg.public.blob.vercel-storage.com/carousels';

const MODULE_CAROUSEL: Record<string, ModuleCarousel> = {
  // "לקרוא תלוש שכר" → the Daisy "3 שורות בתלוש" carousel (cover + 3 lines,
  // NO CTA slide). Hosted via scripts/upload-carousel-payslip.ts.
  'mod-1-5': {
    titleHe: '3 שורות בתלוש',
    slides: [
      { uri: `${BLOB}/mod-1-5/slide-1.png`, alt: '3 שורות בתלוש שאסור לפספס' },
      { uri: `${BLOB}/mod-1-5/slide-2.png`, alt: 'ברוטו מול נטו' },
      { uri: `${BLOB}/mod-1-5/slide-3.png`, alt: 'פנסיה — ההפרשה שנשמרת לעתיד' },
      { uri: `${BLOB}/mod-1-5/slide-4.png`, alt: 'קרן השתלמות — פטור ממס אחרי 6 שנים' },
    ],
  },
};

export function getModuleCarousel(moduleId: string): ModuleCarousel | null {
  return MODULE_CAROUSEL[moduleId] ?? null;
}

/**
 * Build the display-only Topic for a module's carousel chip (id
 * `${moduleId}:carousel`). `defaultOrder` 998 keeps it just before the tool
 * chip (999) and after the real learning chips. RENDER ONLY — never pass it to
 * the completion summary.
 */
export function buildCarouselTopic(moduleId: string, carousel: ModuleCarousel): Topic {
  return {
    id: `${moduleId}:carousel`,
    moduleId,
    kind: 'carousel',
    titleHe: carousel.titleHe,
    iconAsset: TOPIC_ICONS.carousel,
    defaultOrder: 998,
  };
}
