import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { useAnonAdviceStore } from '../anon-advice/useAnonAdviceStore';
import type {
  TradeRoomId,
  TradeRoomMessage,
  MessageSentiment,
  RoomSentimentSummary,
} from './tradeRoomsTypes';
import {
  TRADE_ROOMS,
  buildSeedMessages,
  moderateChatMessage,
  pickCommunityAlias,
  AUTO_REPLY_POOLS,
  SHARK_TIP_POOLS,
  DAILY_FIRST_MESSAGE_COINS,
  DAILY_FIRST_MESSAGE_XP,
  MAX_MESSAGES_PER_ROOM,
  CATCH_UP_IDLE_HOURS,
} from './tradeRoomsData';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function seedAllRooms(): Record<string, TradeRoomMessage[]> {
  const map: Record<string, TradeRoomMessage[]> = {};
  for (const room of TRADE_ROOMS) {
    map[room.id] = buildSeedMessages(room.id);
  }
  return map;
}

interface TradeRoomsState {
  messagesByRoom: Record<string, TradeRoomMessage[]>;
  /** roomId → ISO of last time the user opened the room. */
  lastReadAt: Record<string, string>;
  /** Room currently showing a "typing…" indicator (session-only). */
  typingRoomId: TradeRoomId | null;
  /** Date (YYYY-MM-DD) the daily first-message reward was granted. */
  chatRewardDate: string | null;
  /** Count of community messages since the last shark tip, per room. */
  sinceSharkTip: Record<string, number>;

  // Selectors
  getMessages: (roomId: TradeRoomId) => TradeRoomMessage[];
  getUnreadCount: (roomId: TradeRoomId) => number;
  getLastMessage: (roomId: TradeRoomId) => TradeRoomMessage | null;
  getSentimentSummary: (roomId: TradeRoomId) => RoomSentimentSummary;

  // Actions
  sendMessage: (
    roomId: TradeRoomId,
    body: string,
    sentiment?: MessageSentiment,
  ) =>
    | { ok: true; reward: { coins: number; xp: number } | null }
    | { ok: false; reason: string };
  addCommunityMessage: (roomId: TradeRoomId) => void;
  toggleLike: (roomId: TradeRoomId, messageId: string) => void;
  markRoomRead: (roomId: TradeRoomId) => void;
  catchUpRoom: (roomId: TradeRoomId) => void;
  setTyping: (roomId: TradeRoomId | null) => void;
}

function appendBounded(
  list: TradeRoomMessage[],
  msg: TradeRoomMessage,
): TradeRoomMessage[] {
  return [...list, msg].slice(-MAX_MESSAGES_PER_ROOM);
}

function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const useTradeRoomsStore = create<TradeRoomsState>()(
  persist(
    (set, get) => ({
      messagesByRoom: seedAllRooms(),
      lastReadAt: {},
      typingRoomId: null,
      chatRewardDate: null,
      sinceSharkTip: {},

      getMessages: (roomId) => get().messagesByRoom[roomId] ?? [],

      getUnreadCount: (roomId) => {
        const lastRead = get().lastReadAt[roomId];
        const messages = get().messagesByRoom[roomId] ?? [];
        if (!lastRead) return Math.min(messages.length, 9);
        return messages.filter((m) => !m.isSelf && m.sentAt > lastRead).length;
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
        const msg: TradeRoomMessage = {
          id: makeId('trm'),
          roomId,
          alias,
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

        // First message of the day earns a small reward — talking is playing.
        const today = todayISO();
        if (get().chatRewardDate === today) {
          return { ok: true, reward: null };
        }
        set({ chatRewardDate: today });
        try {
          const economyMod = require('../economy/useEconomyStore');
          economyMod.useEconomyStore.getState().addCoins(DAILY_FIRST_MESSAGE_COINS);
          economyMod.useEconomyStore.getState().addXP(DAILY_FIRST_MESSAGE_XP, 'challenge_complete');
        } catch {
          /* economy store unavailable — skip */
        }
        return {
          ok: true,
          reward: { coins: DAILY_FIRST_MESSAGE_COINS, xp: DAILY_FIRST_MESSAGE_XP },
        };
      },

      addCommunityMessage: (roomId) => {
        const count = (get().sinceSharkTip[roomId] ?? 0) + 1;
        // Every 4th community message, Captain Shark drops knowledge instead.
        const sharkTurn = count >= 4;
        const msg: TradeRoomMessage = sharkTurn
          ? {
              id: makeId('shark'),
              roomId,
              alias: null,
              isSelf: false,
              isShark: true,
              body: pickFrom(SHARK_TIP_POOLS[roomId]),
              likes: 0,
              likedBySelf: false,
              sentAt: new Date().toISOString(),
            }
          : {
              id: makeId('community'),
              roomId,
              alias: pickCommunityAlias(useAnonAdviceStore.getState().selfAlias),
              isSelf: false,
              isShark: false,
              body: pickFrom(AUTO_REPLY_POOLS[roomId]),
              likes: 0,
              likedBySelf: false,
              sentAt: new Date().toISOString(),
            };

        set((state) => ({
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: appendBounded(state.messagesByRoom[roomId] ?? [], msg),
          },
          sinceSharkTip: { ...state.sinceSharkTip, [roomId]: sharkTurn ? 0 : count },
          typingRoomId: state.typingRoomId === roomId ? null : state.typingRoomId,
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

      catchUpRoom: (roomId) => {
        // If the room was idle for hours, backfill a couple of community
        // messages so it feels alive when you walk in.
        const messages = get().messagesByRoom[roomId] ?? [];
        const last = messages[messages.length - 1];
        const idleMs = last ? Date.now() - new Date(last.sentAt).getTime() : Infinity;
        if (idleMs < CATCH_UP_IDLE_HOURS * 3_600_000) return;

        const injectCount = 2 + Math.floor(Math.random() * 2); // 2-3
        const additions: TradeRoomMessage[] = [];
        for (let i = 0; i < injectCount; i += 1) {
          const minutesAgo = (injectCount - i) * (8 + Math.floor(Math.random() * 30));
          additions.push({
            id: makeId('catchup'),
            roomId,
            alias: pickCommunityAlias(useAnonAdviceStore.getState().selfAlias),
            isSelf: false,
            isShark: false,
            body: pickFrom(AUTO_REPLY_POOLS[roomId]),
            likes: Math.floor(Math.random() * 4),
            likedBySelf: false,
            sentAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
          });
        }
        set((state) => ({
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: [...(state.messagesByRoom[roomId] ?? []), ...additions].slice(
              -MAX_MESSAGES_PER_ROOM,
            ),
          },
        }));
      },

      setTyping: (roomId) => set({ typingRoomId: roomId }),
    }),
    {
      name: 'trade-rooms-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        messagesByRoom: state.messagesByRoom,
        lastReadAt: state.lastReadAt,
        chatRewardDate: state.chatRewardDate,
        sinceSharkTip: state.sinceSharkTip,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Seed rooms that are missing (first install / new rooms added later).
        const seeded = seedAllRooms();
        const merged: Record<string, TradeRoomMessage[]> = { ...state.messagesByRoom };
        for (const roomId of Object.keys(seeded)) {
          if (!Array.isArray(merged[roomId]) || merged[roomId].length === 0) {
            merged[roomId] = seeded[roomId];
          }
        }
        state.messagesByRoom = merged;
        state.typingRoomId = null;
      },
    },
  ),
);
