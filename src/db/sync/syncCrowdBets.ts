import { getApiBase } from '../apiBase';

export interface ChoiceOdds {
  choiceId: string;
  pool: number;
  odds: number;
}

/** Live parimutuel odds for a question. */
export async function fetchBetOdds(args: {
  questionId: string;
  choiceIds: string[];
}): Promise<ChoiceOdds[]> {
  const base = getApiBase();
  const url = `${base}/api/crowd-bets/odds?questionId=${encodeURIComponent(args.questionId)}&choices=${encodeURIComponent(args.choiceIds.join(','))}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`crowd-bets/odds GET failed: ${res.status}`);
  }
  const data = (await res.json()) as { ok: boolean; odds: ChoiceOdds[] };
  return data.odds;
}

export interface PlaceBetResult {
  ok: true;
  betId: string;
  lockedOdds: number;
  potentialPayout: number;
  odds: ChoiceOdds[];
}

/** Place a coin bet; the server locks the live odds into the bet. */
export async function placeBet(args: {
  authId: string;
  syncToken?: string | null;
  questionId: string;
  choiceId: string;
  choiceIds: string[];
  stake: number;
}): Promise<PlaceBetResult> {
  const base = getApiBase();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (args.syncToken) headers['X-Sync-Token'] = args.syncToken;

  const res = await fetch(`${base}/api/crowd-bets/place`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      authId: args.authId,
      questionId: args.questionId,
      choiceId: args.choiceId,
      choiceIds: args.choiceIds,
      stake: args.stake,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? `crowd-bets/place POST failed: ${res.status}`);
  }
  return (await res.json()) as PlaceBetResult;
}
