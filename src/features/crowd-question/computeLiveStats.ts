import { useEffect, useState } from 'react';
import type { CrowdOption, CrowdQuestion } from './types';

export interface LiveStats {
  pctA: number;
  pctB: number;
  totalVotes: number;
}

function hashStringMinute(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0;
  }
  return hash;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function getLiveStats(
  question: CrowdQuestion,
  userVote: CrowdOption['id'] | null,
  hasVotedToday: boolean,
  now: number,
): LiveStats {
  const minute = Math.floor(now / 60000);
  const seed = hashStringMinute(`${question.id}|${minute}`);
  const drift = Math.sin(seed) * 1.5;

  const userTilt = userVote === 'a' ? 0.3 : userVote === 'b' ? -0.3 : 0;

  const rawA = question.baselinePct[0] + drift + userTilt;
  const pctA = Math.round(clamp(rawA, 5, 95));
  const pctB = 100 - pctA;

  const totalVotes = question.baselineN + (hasVotedToday ? 1 : 0);

  return { pctA, pctB, totalVotes };
}

export function useLiveStats(
  question: CrowdQuestion,
  userVote: CrowdOption['id'] | null,
  hasVotedToday: boolean,
): LiveStats {
  const [stats, setStats] = useState<LiveStats>(() =>
    getLiveStats(question, userVote, hasVotedToday, Date.now()),
  );

  useEffect(() => {
    setStats(getLiveStats(question, userVote, hasVotedToday, Date.now()));
    const id = setInterval(() => {
      setStats(getLiveStats(question, userVote, hasVotedToday, Date.now()));
    }, 5000);
    return () => clearInterval(id);
  }, [question, userVote, hasVotedToday]);

  return stats;
}