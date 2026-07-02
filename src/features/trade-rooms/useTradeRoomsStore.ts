import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { useAnonAdviceStore } from '../anon-advice/useAnonAdviceStore';
import { useAuthStore } from '../auth/useAuthStore';
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
  /** Date (YYYY-MM-DD) the daily first-message reward was granted. */
  chatRewardDate: string | null;

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
    | { ok: true; messageId: string; reward: { coins: number; xp: number } | null }
    | { ok: false; reason: string };
  removeMessage: (roomId: TradeRoomId, messageId: string) => void;
  toggleLike: (roomId: TradeRoomId, messageId: string) => void;
  markRoomRead: (roomId: TradeRoomId) => void;
}

function appendBounded(
  list: TradeRoomMessage[],
  msg: TradeRoomMessage,
): TradeRoomMessage[] {
  return [...list, msg].slice(-MAX_MESSAGES_PER_ROOM);
}

export const useTradeRoomsStore = create<TradeRoomsState>()(
  persist(
    (set, get) => ({
      messagesByRoom: seedAllRooms(),
      lastReadAt: {},
      chatRewardDate: null,

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
        const avatarId = useAuthStore.getState().profile?.avatarId ?? null;
        const msg: TradeRoomMessage = {
          id: makeId('trm'),
          roomId,
          alias,
          avatarId,
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
    }),
    {
      name: 'trade-rooms-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        messagesByRoom: state.messagesByRoom,
        lastReadAt: state.lastReadAt,
        chatRewardDate: state.chatRewardDate,
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
      },
    },
  ),
);