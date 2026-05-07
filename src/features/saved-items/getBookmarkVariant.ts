import type { FeedItem } from "../finfeed/types";

/**
 * Per-card-type variant for the FeedBookmarkButton background.
 * "dark" = white/gold icon on a translucent black puck (used over dark or
 * full-bleed game cards). "light" = navy/green icon on a translucent white
 * puck (used over pastel cards).
 */
export function getBookmarkVariant(item: FeedItem): "dark" | "light" {
  switch (item.type) {
    // Dark: full-screen video, dark game arenas, scenarios
    case "video":
    case "scenario":
    case "bullshit-swipe":
    case "fomo-killer":
    case "cashout-rush":
    case "budget-ninja":
    case "live-news":
    case "live-market":
    case "simulator-teaser":
    case "trading-nudge":
      return "dark";

    // Light: pastel content cards, lighter mini-games, nudges
    case "quote":
    case "comic":
    case "module-hook":
    case "premium-learning":
    case "did-you-know":
    case "higher-lower":
    case "price-slider":
    case "shark-feedback":
    case "referral-nudge":
    case "macro-event":
    case "daily-quiz":
    case "myth-or-tachles":
    case "daily-dilemma":
    case "daily-investment":
    case "swipe-game":
    case "crash-game":
    case "graham-personality":
    case "diamond-hands":
    case "crowd-question":
    case "finn-hero":
    case "lesson":
      return "light";

    default: {
      const _exhaustive: never = item;
      void _exhaustive;
      return "light";
    }
  }
}