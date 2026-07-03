import { useEffect, useRef, useState } from 'react';
import { fetchCrowdStats, type CrowdQuestionStats } from '../../db/sync/syncCrowdQuestion';
import { getIsraelDateISO, msUntilNextIsraelMidnight } from '../../utils/israelTime';
import type { CrowdOption } from './types';

// Live vote counts barely move minute-to-minute, but this hook mounts inside a
// full-screen popup/pearl that can stay open indefinitely — an 8s poll there
// meant a network round-trip + re-render + width animation every 8s forever,
// feeding the "device runs hot" reports (2026-07-03). 30s keeps it "live"
// enough while cutting the continuous churn ~4×.
const POLL_INTERVAL_MS = 30_000;

export interface LivePercents {
  pctA: number;
  pctB: number;
  total: number;
  hasData: boolean;
  isLoading: boolean;
  error: string | null;
}

export function percentsFromCounts(stats: CrowdQuestionStats): { pctA: number; pctB: number } {
  if (stats.total <= 0) return { pctA: 50, pctB: 50 };
  const rawA = (stats.countA / stats.total) * 100;
  const pctA = Math.round(rawA);
  return { pctA, pctB: 100 - pctA };
}

interface Args {
  questionId: string;
  userVote: CrowdOption['id'] | null;
  optimisticStats: CrowdQuestionStats | null;
}

export function useLivePercents({ questionId, userVote, optimisticStats }: Args): LivePercents {
  const [stats, setStats] = useState<CrowdQuestionStats | null>(optimisticStats);
  const [isLoading, setIsLoading] = useState<boolean>(optimisticStats === null);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let dayBoundaryTimer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const dateIL = getIsraelDateISO();
        const next = await fetchCrowdStats({ questionId, voteDateIL: dateIL });
        if (cancelledRef.current) return;
        setStats(next);
        setError(null);
      } catch (err: unknown) {
        if (cancelledRef.current) return;
        setError(err instanceof Error ? err.message : 'fetch failed');
      } finally {
        if (!cancelledRef.current) setIsLoading(false);
      }
    }

    load();
    pollTimer = setInterval(load, POLL_INTERVAL_MS);

    dayBoundaryTimer = setTimeout(() => {
      setStats(null);
      setIsLoading(true);
      load();
    }, msUntilNextIsraelMidnight() + 2_000);

    return () => {
      cancelledRef.current = true;
      if (pollTimer) clearInterval(pollTimer);
      if (dayBoundaryTimer) clearTimeout(dayBoundaryTimer);
    };
  }, [questionId]);

  useEffect(() => {
    if (optimisticStats) {
      setStats(optimisticStats);
      setIsLoading(false);
    }
  }, [optimisticStats]);

  if (!stats) {
    return {
      pctA: 50,
      pctB: 50,
      total: 0,
      hasData: false,
      isLoading,
      error,
    };
  }

  const tiltedTotal = userVote && stats.total === 0 ? 1 : stats.total;
  const { pctA, pctB } = percentsFromCounts(stats);
  return {
    pctA,
    pctB,
    total: tiltedTotal,
    hasData: stats.total > 0,
    isLoading: false,
    error,
  };
}