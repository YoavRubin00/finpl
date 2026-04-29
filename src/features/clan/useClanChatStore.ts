import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import type { ClanChatMessage } from './clanTypes';
import { SEED_CHAT_MESSAGES, MAX_CHAT_MESSAGES } from './clanData';

interface ClanChatState {
  messages: ClanChatMessage[];
  isTyping: boolean; // simulated "someone is typing" indicator

  sendMessage: (authorId: string, authorName: string, authorAvatar: string, body: string) => void;
  addSystemMessage: (msg: Omit<ClanChatMessage & { kind: 'system' }, 'id' | 'sentAt'>) => void;
  setTyping: (value: boolean) => void;
  addAutoReply: (authorId: string, authorName: string, authorAvatar: string, body: string) => void;
  clearMessages: () => void;
}

function makeId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useClanChatStore = create<ClanChatState>()(
  persist(
    (set, get) => ({
      messages: SEED_CHAT_MESSAGES,
      isTyping: false,

      sendMessage: (authorId, authorName, authorAvatar, body) => {
        if (!body.trim()) return;
        const msg: ClanChatMessage = {
          kind: 'text',
          id: makeId(),
          sentAt: new Date().toISOString(),
          authorId,
          authorName,
          authorAvatar,
          body: body.slice(0, 280),
        };
        set((state) => ({
          messages: [...state.messages, msg].slice(-MAX_CHAT_MESSAGES),
        }));
      },

      addSystemMessage: (partial) => {
        const msg: ClanChatMessage = {
          ...partial,
          kind: 'system',
          id: makeId(),
          sentAt: new Date().toISOString(),
        } as ClanChatMessage;
        set((state) => ({
          messages: [...state.messages, msg].slice(-MAX_CHAT_MESSAGES),
        }));
      },

      setTyping: (value) => {
        set({ isTyping: value });
      },

      addAutoReply: (authorId, authorName, authorAvatar, body) => {
        const msg: ClanChatMessage = {
          kind: 'text',
          id: makeId(),
          sentAt: new Date().toISOString(),
          authorId,
          authorName,
          authorAvatar,
          body,
        };
        set((state) => ({
          messages: [...state.messages, msg].slice(-MAX_CHAT_MESSAGES),
          isTyping: false,
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },
    }),
    {
      name: 'clan-chat-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        // Only persist last 50 messages to keep storage bounded
        messages: state.messages.slice(-50),
      }),
    }
  )
);
