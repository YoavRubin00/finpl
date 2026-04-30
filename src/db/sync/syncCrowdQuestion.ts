import { getApiBase } from '../apiBase';

export interface CrowdQuestionStats {
  countA: number;
  countB: number;
  total: number;
}

export interface CrowdQuestionVoteResult extends CrowdQuestionStats {
  ok: true;
}

/** POST a vote, returns the latest aggregate counts. */
export async function submitCrowdVote(args: {
  authId: string;
  syncToken?: string | null;
  questionId: string;
  choice: 'a' | 'b';
  voteDateIL: string;
}): Promise<CrowdQuestionVoteResult> {
  const base = getApiBase();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (args.syncToken) headers['X-Sync-Token'] = args.syncToken;

  const res = await fetch(`${base}/api/crowd-question/vote`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      authId: args.authId,
      questionId: args.questionId,
      choice: args.choice,
      voteDateIL: args.voteDateIL,
    }),
  });
  if (!res.ok) {
    throw new Error(`crowd-question/vote POST failed: ${res.status}`);
  }
  return (await res.json()) as CrowdQuestionVoteResult;
}

/** Fetch current vote counts for a question on a given Israel-local date. */
export async function fetchCrowdStats(args: {
  questionId: string;
  voteDateIL: string;
}): Promise<CrowdQuestionStats> {
  const base = getApiBase();
  const url = `${base}/api/crowd-question/stats?questionId=${encodeURIComponent(args.questionId)}&voteDateIL=${encodeURIComponent(args.voteDateIL)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`crowd-question/stats GET failed: ${res.status}`);
  }
  const json = (await res.json()) as { ok: boolean; countA: number; countB: number; total: number };
  return { countA: json.countA, countB: json.countB, total: json.total };
}
