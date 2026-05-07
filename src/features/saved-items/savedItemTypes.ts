import type { FeedItem } from "../finfeed/types";

export interface SavedItem {
  id: string;
  type: "lesson" | "sim" | "feed";
  title: string;
  chapterId?: number;
  moduleId?: string;
  feedItemId?: string;
  /** Full FeedItem snapshot for type:"feed" so we can render the actual card later, even if the live feed changes between sessions. */
  feedItemSnapshot?: FeedItem;
  savedAt: string; // ISO date string
}

export type AddSavedResult =
  | { ok: true }
  | { ok: false; reason: "cap" | "duplicate" };

export const MAX_SAVED_ITEMS = 50;