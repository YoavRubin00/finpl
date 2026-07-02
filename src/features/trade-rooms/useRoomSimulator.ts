import { useEffect, useRef } from 'react';
import { useTradeRoomsStore } from './useTradeRoomsStore';
import type { TradeRoomId } from './tradeRoomsTypes';

const MIN_DELAY_MS = 14_000;
const MAX_DELAY_MS = 42_000;
const TYPING_DURATION_MS = 2_200;

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Mounts inside a trade room — keeps the room feeling alive by dropping a
 * community message (or a Captain Shark tip every 4th turn) every 14-42s,
 * with a short "typing…" indicator first.
 */
export function useRoomSimulator(roomId: TradeRoomId, active: boolean): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const { setTyping, addCommunityMessage, catchUpRoom } =
      useTradeRoomsStore.getState();

    if (!active) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setTyping(null);
      return;
    }

    // Backfill a few messages if the room slept while we were away.
    catchUpRoom(roomId);

    function scheduleNext(): void {
      const delay = randomBetween(MIN_DELAY_MS, MAX_DELAY_MS);
      timerRef.current = setTimeout(() => {
        setTyping(roomId);
        typingTimerRef.current = setTimeout(() => {
          addCommunityMessage(roomId);
          scheduleNext();
        }, TYPING_DURATION_MS);
      }, delay);
    }

    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setTyping(null);
    };
  }, [roomId, active]);
}
