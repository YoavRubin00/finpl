import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { useAnonAdviceStore } from '../anon-advice/useAnonAdviceStore';
import { useAuthStore } from '../auth/useAuthStore';
import { tokenStore } from '../../lib/auth/secureStore';
import { fetchRoomMessagesApi, sendRoomMessageApi } from '../../db/sync/syncTradeRooms';
import { formatAlias } from '../anon-advice/anonAdviceData';
import type {
  TradeRoom,
  TradeRoomId,
  TradeRoomMessage,
  MessageSentiment,
  RoomSentimentSummary,
} from './tradeRoomsTypes';
import {
  TRADE_ROOMS,
  moderateChatMessage,
  DAILY_FIRST_MESSAGE_COINS,
  DAILY_FIRST_MESSAGE_XP,
  MAX_MESSAGES_PER_ROOM,
} from './tradeRoomsData';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * A genuine message from another registered member — NOT the user themselves,
 * and NOT Captain Shark's system opener. Only these may count as "unread".
 * This is the iron-rule guard: with no real backend yet there are none, so no
 * fake FOMO badge can ever appear.
 */
function isRealPeerMessage(m: TradeRoomMessage): boolean {
  return !m.isSelf && !m.isShark;
}

/**
 * A single, honest Captain Shark opener per room — a welcome, not fake chatter.
 * It is a system message (isShark) and is therefore never counted as unread.
 */
function buildOpener(room: TradeRoom, sentAtISO: string): TradeRoomMessage {
  return {
    id: `opener-${room.id}`,
    roomId: room.id,
    alias: null,
    avatarId: null,
    isSelf: false,
    isShark: true,
    body: `ברוכים הבאים ל"${room.name}"! החדר שקט כרגע — וזו בדיוק ההזדמנות שלכם לפתוח אותו. שאלה טובה או דעה עם נימוק, ויוצאים לדרך. דעה בלי נימוק שווה כמו רשת בלי דגים.`,
    likes: 0,
    likedBySelf: false,
    sentAt: sentAtISO,
  };
}

function seedOpeners(sentAtISO: string): Record<string, TradeRoomMessage[]> {
  const map: Record<string, TradeRoomMessage[]> = {};
  for (const room of TRADE_ROOMS) {
    map[room.id] = [buildOpener(room, sentAtISO)];
  }
  return map;
}

/** Mark every built-in room read at seed time so the lone opener is not "unread". */
function seedReadAt(atISO: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const room of TRADE_ROOMS) {
    map[room.id] = atISO;
  }
  return map;
}

/** Real, self-only weekly summary of the user's activity in rooms (for A5 / BATCH 6). */
export interface WeeklyRoomStats {
  /** Messages the user themselves sent across all rooms in the last 7 days. */
  messagesSent: number;
  /** Distinct calendar days (last 7) on which the user posted at least once. */
  activeDays: number;
  /** Coins earned from rooms this week — the daily first-message reward per active day. */
  coinsEarned: number;
}

interface TradeRoomsState {
  messagesByRoom: Record<string, TradeRoomMessage[]>;
  /** roomId → ISO of last time the user opened the room. */
  lastReadAt: Record<string, string>;
  /** Date (YYYY-MM-DD) the daily first-message reward was granted. */
  chatRewardDate: string | null;
  /** Rooms the user created — appear alongside the built-in rooms. */
  customRooms: TradeRoom[];
  /** The name others see in chat (Yoav 2026-07-04). null → alias fallback. */
  chatNickname: string | null;

  // Selectors
  getMessages: (roomId: TradeRoomId) => TradeRoomMessage[];
  getUnreadCount: (roomId: TradeRoomId) => number;
  getLastMessage: (roomId: TradeRoomId) => TradeRoomMessage | null;
  getSentimentSummary: (roomId: TradeRoomId) => RoomSentimentSummary;
  getRoom: (roomId: TradeRoomId) => TradeRoom | null;
  /** Read-only weekly self-summary — real data only, nothing about other people. */
  getWeeklyRoomStats: () => WeeklyRoomStats;

  // Actions
  sendMessage: (
    roomId: TradeRoomId,
    body: string,
    sentiment?: MessageSentiment,
  ) =>
    | { ok: true; messageId: string; reward: { coins: number; xp: number } | null }
    | { ok: false; reason: string };
  createRoom: (input: {
    name: string;
    emoji: string;
    tagline: string;
  }) => { ok: true; roomId: string } | { ok: false; reason: string };
  removeMessage: (roomId: TradeRoomId, messageId: string) => void;
  toggleLike: (roomId: TradeRoomId, messageId: string) => void;
  markRoomRead: (roomId: TradeRoomId) => void;
  setChatNickname: (nickname: string | null) => void;
  /** Pull the room's REAL server feed and merge it in (registered users only). */
  syncRoom: (roomId: TradeRoomId) => Promise<void>;
}

function appendBounded(
  list: TradeRoomMessage[],
  msg: TradeRoomMessage,
): TradeRoomMessage[] {
  return [...list, msg].slice(-MAX_MESSAGES_PER_ROOM);
}

export const useTradeRoomsStore = create<TradeRoomsState>()(
  persist(
    (set, get) => {
      const seedNow = new Date().toISOString();
      return {
      messagesByRoom: seedOpeners(seedNow),
      lastReadAt: seedReadAt(seedNow),
      chatRewardDate: null,
      customRooms: [],
      chatNickname: null,

      getMessages: (roomId) => get().messagesByRoom[roomId] ?? [],

      getRoom: (roomId) => {
        const builtin = TRADE_ROOMS.find((r) => r.id === roomId);
        if (builtin) return builtin;
        return get().customRooms.find((r) => r.id === roomId) ?? null;
      },

      getUnreadCount: (roomId) => {
        // Unread = only genuine peer messages after lastRead. The Captain Shark
        // opener (isShark) and the user's own messages never count.
        const lastRead = get().lastReadAt[roomId];
        const peers = (get().messagesByRoom[roomId] ?? []).filter(isRealPeerMessage);
        if (!lastRead) return Math.min(peers.length, 9);
        return peers.filter((m) => m.sentAt > lastRead).length;
      },

      getWeeklyRoomStats: () => {
        // Self-data only: what the user themselves did in rooms this week.
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const days = new Set<string>();
        let messagesSent = 0;
        for (const list of Object.values(get().messagesByRoom)) {
          for (const m of list) {
            if (!m.isSelf) continue;
            if (new Date(m.sentAt).getTime() < weekAgo) continue;
            messagesSent += 1;
            days.add(m.sentAt.slice(0, 10));
          }
        }
        // Each active day earned exactly one first-message reward.
        return {
          messagesSent,
          activeDays: days.size,
          coinsEarned: days.size * DAILY_FIRST_MESSAGE_COINS,
        };
      },

      getLastMessage: (roomId) => {
        const messages = get().messagesByRoom[roomId] ?? [];
        return messages.length > 0 ? messages[messages.length - 1] : null;
      },

      getSentimentSummary: (roomId) => {
        const messages = get().messagesByRoom[roomId] ?? [];
        // Recent tagged messages carry the room's mood.
        const tagged = messages.filter((m) => m.sentiment).slice(-20);
        if (tagged.length === 0) return { bullPercent: 50, taggedCount: 0 };
        const bulls = tagged.filter((m) => m.sentiment === 'bull').length;
        return {
          bullPercent: Math.round((bulls / tagged.length) * 100),
          taggedCount: tagged.length,
        };
      },

      sendMessage: (roomId, body, sentiment) => {
        const verdict = moderateChatMessage(body);
        if (!verdict.ok) {
          return { ok: false, reason: verdict.reason ?? 'ההודעה לא נשלחה.' };
        }

        const alias = useAnonAdviceStore.getState().ensureSelfAlias();
        const avatarId = useAuthStore.getState().profile?.avatarId ?? null;
        const nickname = get().chatNickname;
        const msg: TradeRoomMessage = {
          id: makeId('trm'),
          roomId,
          alias,
          avatarId,
          displayName: nickname,
          isSelf: true,
          isShark: false,
          body: body.trim(),
          sentiment,
          likes: 0,
          likedBySelf: false,
          sentAt: new Date().toISOString(),
        };

        set((state) => ({
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: appendBounded(state.messagesByRoom[roomId] ?? [], msg),
          },
        }));

        // Fire-and-forget: publish to the REAL room feed (registered users).
        // On success the local message learns its server id so the next sync
        // doesn't duplicate it. Guests stay local-only (guest gate nudges).
        const authId = useAuthStore.getState().email;
        if (authId) {
          void (async () => {
            try {
              const syncToken = await tokenStore.get();
              const sent = await sendRoomMessageApi({
                authId,
                syncToken,
                roomId,
                body: msg.body,
                sentiment,
                displayName: nickname ?? useAuthStore.getState().displayName ?? formatAlias(alias),
                avatarId,
              });
              if (sent.id) {
                set((state) => ({
                  messagesByRoom: {
                    ...state.messagesByRoom,
                    [roomId]: (state.messagesByRoom[roomId] ?? []).map((m) =>
                      m.id === msg.id ? { ...m, serverId: sent.id } : m,
                    ),
                  },
                }));
              }
            } catch {
              /* offline / server hiccup — the message stays local, honest */
            }
          })();
        }

        // First message of the day earns a small reward — talking is playing.
        const today = todayISO();
        if (get().chatRewardDate === today) {
          return { ok: true, messageId: msg.id, reward: null };
        }
        set({ chatRewardDate: today });
        try {
          // EconomyUI store fires the animated coin counter, not just the balance.
          const economyMod = require('../economy/useEconomyUIStore');
          economyMod.useEconomyUIStore.getState().addCoins(DAILY_FIRST_MESSAGE_COINS);
          economyMod.useEconomyUIStore.getState().addXP(DAILY_FIRST_MESSAGE_XP, 'challenge_complete');
        } catch {
          /* economy store unavailable — skip */
        }
        return {
          ok: true,
          messageId: msg.id,
          reward: { coins: DAILY_FIRST_MESSAGE_COINS, xp: DAILY_FIRST_MESSAGE_XP },
        };
      },

      createRoom: ({ name, emoji, tagline }) => {
        const cleanName = name.trim();
        const cleanTagline = tagline.trim();
        if (cleanName.length < 2 || cleanName.length > 24) {
          return { ok: false, reason: 'שם חדר: 2 עד 24 תווים.' };
        }
        const nameCheck = moderateChatMessage(cleanName);
        if (!nameCheck.ok) {
          return { ok: false, reason: nameCheck.reason ?? 'השם לא מתאים.' };
        }
        const exists = [...TRADE_ROOMS, ...get().customRooms].some(
          (r) => r.name === cleanName,
        );
        if (exists) {
          return { ok: false, reason: 'כבר יש חדר עם השם הזה.' };
        }

        const roomId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const room: TradeRoom = {
          id: roomId,
          name: cleanName,
          emoji: emoji || '💬',
          tagline: cleanTagline.length > 0 ? cleanTagline : 'חדר קהילה חדש — פתחו את הדיון',
          accentColor: '#0ea5e9',
          accentBg: '#e0f2fe',
          memberBase: 1,
          pinnedTip: 'חדר חדש במים. קבעו את הטון — בלי ספאם, עם נימוקים.',
          isCustom: true,
        };

        // Captain Shark opens every new room.
        const welcome: TradeRoomMessage = {
          id: makeId('shark'),
          roomId,
          alias: null,
          avatarId: null,
          isSelf: false,
          isShark: true,
          body: `ברוכים הבאים ל"${cleanName}"! החדר נפתח הרגע — ההודעה הראשונה קובעת את הכיוון.`,
          likes: 0,
          likedBySelf: false,
          sentAt: new Date().toISOString(),
        };

        set((state) => ({
          customRooms: [...state.customRooms, room],
          messagesByRoom: { ...state.messagesByRoom, [roomId]: [welcome] },
        }));
        return { ok: true, roomId };
      },

      /** Used by the moderation bot to retract a message that failed review. */
      removeMessage: (roomId, messageId) => {
        set((state) => ({
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: (state.messagesByRoom[roomId] ?? []).filter((m) => m.id !== messageId),
          },
        }));
      },

      toggleLike: (roomId, messageId) => {
        set((state) => ({
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: (state.messagesByRoom[roomId] ?? []).map((m) => {
              if (m.id !== messageId) return m;
              const liked = !m.likedBySelf;
              return { ...m, likedBySelf: liked, likes: Math.max(0, m.likes + (liked ? 1 : -1)) };
            }),
          },
        }));
      },

      markRoomRead: (roomId) => {
        set((state) => ({
          lastReadAt: { ...state.lastReadAt, [roomId]: new Date().toISOString() },
        }));
      },

      setChatNickname: (nickname) => {
        const clean = nickname?.trim() ?? '';
        set({ chatNickname: clean.length >= 2 ? clean.slice(0, 24) : null });
      },

      syncRoom: async (roomId) => {
        const authId = useAuthStore.getState().email;
        if (!authId) return; // guests: local-only until they register
        try {
          const syncToken = await tokenStore.get();
          const serverMsgs = await fetchRoomMessagesApi({ authId, syncToken, roomId });
          if (serverMsgs.length === 0) return;
          set((state) => {
            const existing = state.messagesByRoom[roomId] ?? [];
            const known = new Set<string>();
            for (const m of existing) {
              known.add(m.id);
              if (m.serverId) known.add(m.serverId);
            }
            const fresh: TradeRoomMessage[] = serverMsgs
              .filter((sm) => !known.has(sm.id))
              .map((sm) => ({
                id: sm.id,
                roomId,
                alias: null,
                avatarId: sm.avatarId,
                displayName: sm.displayName,
                serverId: sm.id,
                isSelf: sm.isSelf,
                isShark: false,
                body: sm.body,
                sentiment: sm.sentiment ?? undefined,
                likes: 0,
                likedBySelf: false,
                sentAt: sm.sentAt,
              }));
            if (fresh.length === 0) return state;
            const merged = [...existing, ...fresh]
              .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
              .slice(-MAX_MESSAGES_PER_ROOM);
            return {
              ...state,
              messagesByRoom: { ...state.messagesByRoom, [roomId]: merged },
            };
          });
        } catch {
          /* offline / server hiccup — keep whatever we have */
        }
      },
      };
    },
    {
      name: 'trade-rooms-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        messagesByRoom: state.messagesByRoom,
        lastReadAt: state.lastReadAt,
        chatRewardDate: state.chatRewardDate,
        customRooms: state.customRooms,
        chatNickname: state.chatNickname,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.customRooms)) state.customRooms = [];
        if (typeof state.chatNickname !== 'string') state.chatNickname = null;
        const nowStr = new Date().toISOString();
        const messages: Record<string, TradeRoomMessage[]> = { ...state.messagesByRoom };
        const reads: Record<string, string> = { ...state.lastReadAt };

        // Built-in rooms: drop the legacy multi-message seed (ids "seed-*") — it
        // was fake FOMO — and guarantee exactly one Captain Shark opener up top.
        for (const room of TRADE_ROOMS) {
          const existing = Array.isArray(messages[room.id]) ? messages[room.id] : [];
          const kept = existing.filter((m) => !m.id.startsWith('seed-'));
          const opener = kept.find((m) => m.isShark) ?? buildOpener(room, nowStr);
          const rest = kept.filter((m) => !m.isShark);
          messages[room.id] = [opener, ...rest];
        }

        // A room whose only content is the opener must never show as "unread"
        // anywhere. Mark it read at the opener's time (keeping any later real read).
        for (const roomId of Object.keys(messages)) {
          const list = messages[roomId];
          if (list.some(isRealPeerMessage)) continue;
          const opener = list.find((m) => m.isShark);
          const openerTime = opener ? opener.sentAt : nowStr;
          const cur = reads[roomId];
          if (!cur || cur < openerTime) reads[roomId] = openerTime;
        }

        state.messagesByRoom = messages;
        state.lastReadAt = reads;
      },
    },
  ),
);