/**
 * Cloud CTA copy. Bar pushes call-to-action variants (bridge / referral /
 * whatsapp) to bar_content (type 'cta'); each pearl CTA card renders the copy
 * from here instead of its hardcoded strings, so Bar can iterate live. Multiple
 * rows per kind = an A/B test: pickBarCta() randomly assigns one variant per
 * impression and the card reports it via cta_variant, so PostHog can compare
 * which converts best. Falls back to the card's own copy when the cloud is
 * empty/unreachable. Session-lived in-memory cache.
 */
import { fetchBarContent, type BarContentItem } from './barContentApi';

export type BarCtaKind = 'trading' | 'referral' | 'whatsapp';

export interface BarCta {
  kind: BarCtaKind;
  variant: string;
  title?: string;
  body?: string;
  cta?: string;
  imageUrl?: string | null;
}

let byKind: Record<BarCtaKind, BarCta[]> = { trading: [], referral: [], whatsapp: [] };
let loaded = false;
let inflight: Promise<void> | null = null;

function toCta(item: BarContentItem): BarCta | null {
  const kind = item.kind;
  if (kind !== 'trading' && kind !== 'referral' && kind !== 'whatsapp') return null;
  return {
    kind,
    variant: typeof item.variant === 'string' ? item.variant : item.key,
    title: typeof item.title === 'string' ? item.title : undefined,
    body: typeof item.body === 'string' ? item.body : undefined,
    cta: typeof item.cta === 'string' ? item.cta : undefined,
    imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : null,
  };
}

/** Fetch + cache Bar's CTA variants once. Safe to call repeatedly. */
export async function loadBarCtas(): Promise<void> {
  if (loaded) return;
  if (!inflight) {
    inflight = (async () => {
      const items = await fetchBarContent('cta');
      const map: Record<BarCtaKind, BarCta[]> = { trading: [], referral: [], whatsapp: [] };
      for (const it of items) {
        const c = toCta(it);
        if (c) map[c.kind].push(c);
      }
      byKind = map;
      loaded = true;
      inflight = null;
    })();
  }
  await inflight;
}

/** Random active cloud variant for this kind (the A/B assignment), or null. */
export function pickBarCta(kind: BarCtaKind): BarCta | null {
  const pool = byKind[kind];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
