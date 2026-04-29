import { useEffect, useRef } from 'react';
import { useClanChatStore } from './useClanChatStore';
import { MOCK_MEMBERS, MOCK_CHAT_LINES, SELF_ID } from './clanData';

const MIN_DELAY_MS = 30_000; // 30s
const MAX_DELAY_MS = 90_000; // 90s
const TYPING_DURATION_MS = 2_500;

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Mounts on the Chat tab — auto-sends a simulated reply every 30-90s */
export function useChatSimulator(active: boolean): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setTyping, addAutoReply } = useClanChatStore.getState();

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setTyping(false);
      return;
    }

    function scheduleNext(): void {
      const delay = randomBetween(MIN_DELAY_MS, MAX_DELAY_MS);

      timerRef.current = setTimeout(() => {
        // Pick a non-self member
        const nonSelf = MOCK_MEMBERS.filter((m) => m.id !== SELF_ID);
        const member = pickRandom(nonSelf);
        const line = pickRandom(MOCK_CHAT_LINES);

        // Show typing indicator
        setTyping(true);

        typingTimerRef.current = setTimeout(() => {
          addAutoReply(member.id, member.name, member.avatar, line);
          scheduleNext();
        }, TYPING_DURATION_MS);
      }, delay);
    }

    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setTyping(false);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
}