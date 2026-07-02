/**
 * Friends feature — local-first community profiles.
 * No backend: a fixed simulated community (friendsData.ts) merged with
 * locally-persisted friendship state (useFriendsStore.ts).
 */

export interface CommunityProfile {
  id: string;
  /** Short Hebrew first name, e.g. "נועה", "איתי". */
  name: string;
  /** Community nickname/title, e.g. "המשקיעה". */
  title: string;
  /** Avatar id that exists in src/features/avatars/avatarData.ts. */
  avatarId: string;
  level: number;
  coinsWon: number;
  /** Favorite trade room / hangout, display-only. */
  favoriteRoom: string;
  isFriend: boolean;
  requestPending: boolean;
}