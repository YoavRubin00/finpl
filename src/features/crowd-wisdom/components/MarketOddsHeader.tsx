import React, { useEffect, useState } from 'react';

import { getApiBase } from '../../../db/apiBase';
import type { CrowdWisdomQuestion } from '../types';
import { OddsProbabilityChart, type OddsHistoryPoint } from './OddsProbabilityChart';

// Polymarket-style market header. All numbers come from the REAL bet ledger via
// /api/crowd-bets/history — the honest first-mover state vs. the probability
// graph is decided by betCount inside OddsProbabilityChart, never fabricated.

interface HistoryResponse {
  ok: boolean;
  betCount: number;
  current: Record<string, number>;
  series: OddsHistoryPoint[];
}

interface MarketOddsHeaderProps {
  question: CrowdWisdomQuestion;
}

export function MarketOddsHeader({ question }: MarketOddsHeaderProps): React.ReactElement | null {
  const [data, setData] = useState<HistoryResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = getApiBase();
        const choices = question.choices.map((c) => c.id).join(',');
        const res = await fetch(
          `${base}/api/crowd-bets/history?questionId=${encodeURIComponent(question.id)}&choices=${encodeURIComponent(choices)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as HistoryResponse;
        if (!cancelled && json.ok) setData(json);
      } catch {
        /* market view is optional — hide when offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [question.id]);

  // Offline / still loading — stay quiet until we have real data to show.
  if (!data) return null;

  return (
    <OddsProbabilityChart
      choices={question.choices}
      betCount={data.betCount}
      current={data.current}
      series={data.series}
    />
  );
}
