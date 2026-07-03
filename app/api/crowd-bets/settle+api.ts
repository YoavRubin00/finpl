/**
 * GET /api/crowd-bets/settle  — cron-triggered prediction settlement.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (Vercel cron header). Idempotent:
 * only ever touches rows still `status='pending'`, so a re-run is a no-op.
 *
 * Flow: for every question with pending stakes past their close boundary, read
 * the REAL market outcome (`_resolve`) and pay out parimutuel peer-to-peer
 * (`settleBets` — winners split the losers' pool, no house). Coins are NOT moved
 * here; the payout is stamped on the row and credited later, once, via
 * /api/crowd-bets/claim on the user's next open (server-authoritative dedupe).
 */

import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { safeErrorResponse } from '../_shared/safeError';
import { json } from '../_shared/json';
import { resolveQuestion } from './_resolve';
import { settleBets, type SettleableBet } from '../../../src/features/crowd-wisdom/lib/betResolution';
import { getQuestionById } from '../../../src/features/crowd-wisdom/data/seedQuestions';
import { getQuestionCloseTime } from '../../../src/features/crowd-wisdom/lib/questionSchedule';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  return drizzle(neon(url));
}

interface PendingBetRow {
  id: string;
  question_id: string;
  choice_id: string;
  stake: number;
  created_at: string;
}

export async function GET(request: Request): Promise<Response> {
  const auth = request.headers.get('authorization') ?? '';
  const expected = process.env.CRON_SECRET ?? '';
  if (!expected || auth !== `Bearer ${expected}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    const now = new Date();

    const res = await db.execute(sql`
      SELECT id, question_id, choice_id, stake, created_at
      FROM crowd_bets
      WHERE status = 'pending'
    `);
    const rows = res.rows as unknown as PendingBetRow[];

    // Group pending stakes by question.
    const byQuestion = new Map<string, PendingBetRow[]>();
    for (const r of rows) {
      const arr = byQuestion.get(r.question_id);
      if (arr) arr.push(r);
      else byQuestion.set(r.question_id, [r]);
    }

    const summary: Array<{ questionId: string; settled: number; winningChoiceId: string | null }> = [];

    for (const [questionId, bets] of Array.from(byQuestion.entries())) {
      const q = getQuestionById(questionId);

      // A stake is DUE once the close boundary AFTER it was placed has passed.
      // (Orphan question with no schedule → settle so the coins never get stuck.)
      const due = bets.filter((b) => {
        if (!q) return true;
        const closeAt = getQuestionCloseTime(q, new Date(b.created_at));
        return now.getTime() > closeAt.getTime();
      });
      if (due.length === 0) continue;

      // Real outcome (null → every due stake refunded — never fabricate a winner).
      const outcome = q ? await resolveQuestion(questionId) : null;
      const settleable: SettleableBet[] = due.map((b) => ({ id: b.id, choiceId: b.choice_id, stake: b.stake }));
      const settlements = settleBets(settleable, outcome);

      for (const s of settlements) {
        await db.execute(sql`
          UPDATE crowd_bets
          SET status = ${s.status},
              payout = ${s.payout},
              winning_choice_id = ${outcome?.winningChoiceId ?? null},
              resolved_at = ${now.toISOString()}
          WHERE id = ${s.id} AND status = 'pending'
        `);
      }

      summary.push({ questionId, settled: settlements.length, winningChoiceId: outcome?.winningChoiceId ?? null });
    }

    return json({ ok: true, settledQuestions: summary.length, detail: summary });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'crowd-bets/settle GET');
  }
}
