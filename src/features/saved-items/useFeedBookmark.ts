import { useCallback } from "react";
import { Alert } from "react-native";
import type { FeedItem } from "../finfeed/types";
import { useSavedItemsStore } from "./useSavedItemsStore";
import { useSubscriptionStore } from "../subscription/useSubscriptionStore";
import { useUpgradeModalStore } from "../../stores/useUpgradeModalStore";
import { successHaptic, tapHaptic, errorHaptic } from "../../utils/haptics";
import { getFeedItemTitle } from "./getFeedItemTitle";
import { MAX_SAVED_ITEMS } from "./savedItemTypes";

export interface UseFeedBookmarkResult {
  isBookmarked: boolean;
  isPro: boolean;
  toggle: () => void;
}

/**
 * Centralized hook for any feed-card bookmark button. Handles PRO gating,
 * dedup, cap (50), haptics, and consistent id format `feed-{item.id}`.
 *
 * Non-PRO users see the icon and on tap get the global UpgradeModal
 * (Captain Shark-themed, "saved_items" feature copy).
 */
export function useFeedBookmark(item: FeedItem): UseFeedBookmarkResult {
  const id = `feed-${item.id}`;
  const isBookmarked = useSavedItemsStore((s) => s.isSaved(id));
  const addItem = useSavedItemsStore((s) => s.addItem);
  const removeItem = useSavedItemsStore((s) => s.removeItem);
  const isPro = useSubscriptionStore(
    (s) => s.tier === "pro" && s.status === "active",
  );
  const showUpgradeModal = useUpgradeModalStore((s) => s.show);

  const toggle = useCallback(() => {
    if (!isPro) {
      tapHaptic();
      showUpgradeModal("saved_items");
      return;
    }

    if (isBookmarked) {
      tapHaptic();
      removeItem(id);
      return;
    }

    const result = addItem({
      id,
      type: "feed",
      title: getFeedItemTitle(item),
      feedItemId: item.id,
      feedItemSnapshot: item,
    });

    if (result.ok) {
      successHaptic();
    } else if (result.reason === "cap") {
      errorHaptic();
      Alert.alert(
        "הגעת לגבול",
        `אפשר לשמור עד ${MAX_SAVED_ITEMS} פריטים. מחק פריט קיים כדי לשמור חדש.`,
        [{ text: "הבנתי", style: "default" }],
      );
    }
  }, [isPro, isBookmarked, id, item, addItem, removeItem, showUpgradeModal]);

  return { isBookmarked, isPro, toggle };
}