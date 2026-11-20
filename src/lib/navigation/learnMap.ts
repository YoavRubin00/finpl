import type { Href, Router } from "expo-router";

/**
 * The learn map lives at exactly one route: the `index` tab.
 *
 * `/(tabs)/learn` used to mount a SECOND full copy of the map (the heaviest
 * screen in the app: ~48 nodes, ~40 pearls, thousands of SVG circles), and any
 * link to it kept both copies alive for the rest of the session. It is now a
 * thin redirect (app/(tabs)/learn.tsx) that forwards here with its query
 * params, so old links, already-scheduled notifications and server pushes
 * that still say `/(tabs)/learn` keep working (perf pass 20.11).
 */
export const LEARN_MAP_PATH = "/(tabs)/index";

type ParamValue = string | number | boolean | null | undefined | readonly string[];

/** `/(tabs)/index?a=1&b=2`, skipping empty values. Array values repeat the key. */
export function learnMapHref(params?: Record<string, ParamValue>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    const values = Array.isArray(value) ? value : [String(value)];
    for (const v of values) parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return parts.length > 0 ? `${LEARN_MAP_PATH}?${parts.join("&")}` : LEARN_MAP_PATH;
}

const LEGACY_LEARN_PATH = /^\/(?:\(tabs\)\/)?learn(?=[?#]|$)/;

/** Rewrites a legacy `/(tabs)/learn…` (or `/learn…`) href to the one map, keeping
 *  the query string. Any other href comes back unchanged. */
export function normalizeLearnMapHref(href: string): string {
  return LEGACY_LEARN_PATH.test(href) ? href.replace(LEGACY_LEARN_PATH, LEARN_MAP_PATH) : href;
}

/**
 * Leave a screen that was pushed over the tabs and land on the learn map.
 * Only for screens on the ROOT stack (app/<route>), never for components that
 * render inside a tab: there `dismissTo` targets the tab navigator, which
 * cannot handle it.
 *
 * `router.replace` from a stack screen swaps that screen for a brand-new
 * (tabs) tree, so the old tabs (with their map) stay mounted underneath and a
 * second map starts. `dismissTo` pops back to the (tabs) already in the stack
 * instead, the same premium return LessonFlowScreen uses. When nothing can be
 * dismissed (cold start / deep link) it falls back to `replace`, which is what
 * these call sites did before.
 */
export function returnToLearnMap(router: Router, params?: Record<string, ParamValue>): void {
  const href = learnMapHref(params) as Href;
  if (router.canDismiss()) router.dismissTo(href);
  else router.replace(href);
}
