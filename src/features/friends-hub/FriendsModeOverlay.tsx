import React from "react";
import { View } from "react-native";

import { useFriendsModeStore } from "./useFriendsModeStore";
import { FriendsTabRow } from "./FriendsTabRow";

/**
 * Sticky bottom tab bar for routes that live OUTSIDE `app/(tabs)/` (clan,
 * fantasy, anon-advice, crowd-wisdom). Each of those Stack layouts wraps its
 * children in this component so the Friends Mode bar follows the user.
 *
 * Renders nothing when Friends Mode is disabled.
 *
 * Usage:
 *   <FriendsModeOverlay>
 *     <Stack screenOptions={...} />
 *   </FriendsModeOverlay>
 */
interface FriendsModeOverlayProps {
  children: React.ReactNode;
}

export function FriendsModeOverlay({ children }: FriendsModeOverlayProps) {
  const enabled = useFriendsModeStore((s) => s.enabled);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{children}</View>
      {enabled ? <FriendsTabRow /> : null}
    </View>
  );
}
