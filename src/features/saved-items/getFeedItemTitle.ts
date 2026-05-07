import type { FeedItem } from "../finfeed/types";

/**
 * Hebrew, human-readable title for any FeedItem. Used as the SavedItem.title
 * when bookmarking from the feed, and as a fallback in SavedItemsScreen
 * when the snapshot is missing.
 */
export function getFeedItemTitle(item: FeedItem): string {
  switch (item.type) {
    case "video":
      return item.title;
    case "quote":
      return item.author ? `ציטוט — ${item.author}` : "ציטוט";
    case "comic":
      return item.title;
    case "module-hook":
      return `הצצה: ${item.moduleTitle}`;
    case "macro-event":
      return `אירוע מאקרו: ${item.event.headline}`;
    case "scenario":
      return `תרחיש: ${item.scenario.title}`;
    case "daily-quiz":
      return "חידון יומי";
    case "myth-or-tachles":
      return "מיתוס או תכלס?";
    case "premium-learning":
      return `לימוד פרימיום: ${item.moduleTitle}`;
    case "finn-hero":
      return "פין מציג";
    case "daily-dilemma":
      return "דילמה יומית";
    case "daily-investment":
      return "השקעה יומית";
    case "crash-game":
      return "משחק קראש";
    case "swipe-game":
      return "משחק החלקה";
    case "graham-personality":
      return "מבחן אישיות גראהם";
    case "bullshit-swipe":
      return "מיני-משחק: בולשיט סוויפ";
    case "higher-lower":
      return "מיני-משחק: גבוה-נמוך";
    case "budget-ninja":
      return "מיני-משחק: בודג'ט נינג'ה";
    case "price-slider":
      return "מיני-משחק: סליידר המחיר";
    case "cashout-rush":
      return "מיני-משחק: קאשאאוט ראש";
    case "fomo-killer":
      return "מיני-משחק: FOMO Killer";
    case "did-you-know":
      return "הידעת?";
    case "diamond-hands":
      return "Diamond Hands";
    case "shark-feedback":
      return "סקר הקפטן";
    case "trading-nudge":
      return "פתח חשבון מסחר";
    case "referral-nudge":
      return "הזמן חבר";
    case "simulator-teaser":
      return `סימולטור: ${item.simulator.teaserTitle}`;
    case "live-market":
      return "השוק חי";
    case "live-news":
      return "חדשות חיות";
    case "crowd-question":
      return "שאלת הקהל";
    case "lesson":
      return item.title;
    default: {
      const _exhaustive: never = item;
      void _exhaustive;
      return "פריט שמור";
    }
  }
}