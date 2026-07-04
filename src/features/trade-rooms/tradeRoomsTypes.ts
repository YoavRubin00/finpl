// Types for Trade Rooms ("חדרי מסחר") — community chat rooms per market,
// styled like WhatsApp/Telegram/Discord trading communities.
// Identity is the same pseudonymous "shark alias" used by anon-advice.

import type { AnonAlias } from '../anon-advice/anonAdviceTypes';

/** Built-in room ids; user-created rooms get generated `custom-*` ids. */
export type BuiltinTradeRoomId =
  | 'wallstreet'
  | 'telaviv'
  | 'crypto'
  | 'beginners'
  | 'daily-event';

export type TradeRoomId = BuiltinTradeRoomId | (string & {});

/** Bullish / bearish tag a member can attach to a message. */
export type MessageSentiment = 'bull' | 'bear';

export interface TradeRoom {
  id: TradeRoomId;
  name: string;
  emoji: string;
  /** Short subtitle under the room name in the list. */
  tagline: string;
  /** Accent for the avatar tile + header. */
  accentColor: string;
  /** Softer bg for the avatar tile. */
  accentBg: string;
  /** Base "members" count — jittered deterministically per day. */
  memberBase: number;
  /** Pinned Captain Shark message shown at the top of the room. */
  pinnedTip: string;
  /** True for the rotating daily-event room. */
  isDailyEvent?: boolean;
  /** True for rooms the user created. */
  isCustom?: boolean;
}

export interface TradeRoomMessage {
  id: string;
  roomId: TradeRoomId;
  /** null → Captain Shark (system persona). */
  alias: AnonAlias | null;
  /** Game avatar id (AvatarImage mascot); falls back to alias emoji. */
  avatarId?: string | null;
  /** Chat nickname (server display_name) — takes precedence over alias. */
  displayName?: string | null;
  /** Server row id once the message is synced — the dedupe key vs the server feed. */
  serverId?: string | null;
  isSelf: boolean;
  isShark: boolean;
  body: string;
  /** Optional bullish/bearish tag rendered on the bubble. */
  sentiment?: MessageSentiment;
  /** Optional ticker chip, e.g. "NVDA" / "טבע". */
  ticker?: string;
  likes: number;
  likedBySelf: boolean;
  sentAt: string; // ISO
}

export interface RoomSentimentSummary {
  bullPercent: number;
  taggedCount: number;
}
