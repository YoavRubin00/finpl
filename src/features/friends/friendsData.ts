import type { CommunityProfile } from './friendsTypes';

/**
 * Real friend graph only (P0-2: fabrication REMOVED).
 *
 * This used to hold 10 invented profiles with fabricated levels + `coinsWon`,
 * which the "אלופי המטבעות" board rendered as real competitors, and which the
 * friends store auto-"approved" on a 20-45s timer — pure fabrication.
 *
 * Under the founder's iron rule (zero fabricated data) there are NO invented
 * people. This list is empty until a real friend-graph endpoint exists; the
 * only real social graph today is `referrals` (referredFriends). The array +
 * type are kept so existing consumers keep compiling and can be populated from
 * the server later.
 */
export const FRIEND_PROFILES: CommunityProfile[] = [];
