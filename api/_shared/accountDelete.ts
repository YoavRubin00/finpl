// api/_shared/accountDelete.ts
//
// POST /api/account/delete — delete the signed-in user's account and data
// (App Store Review Guideline 5.1.1(v); Google Play's account deletion
// policy). Production (api/account/delete.ts) and the dev twin
// (app/api/account/delete+api.ts) run this handler; the Neon wiring is
// accountDeleteStore.ts (the table-by-table plan is documented there) and
// scripts/test-account-delete.ts runs it with in-memory fakes.
//
//   Authorization: Bearer <session>   required. Acts ONLY on the token's user;
//                                     a body authId naming anyone else → 403.
//   Body { confirm: 'DELETE_MY_ACCOUNT' }   required (400 CONFIRM_REQUIRED),
//                                     so no generic or accidental POST deletes.
//   → 200 { ok: true, deleted: true }                       deleted now
//   → 200 { ok: true, deleted: false, alreadyDeleted: true }  the account was
//     already gone (the retry after an answer that never arrived): idempotent.
//   → 401 no / invalid / expired session · 403 · 400 · 429 · 500 (nothing
//     deleted: everything runs in one transaction).
//
// After deletion the session's token is useless: every account check
// (withAuth, the referral and account handlers) looks the row up by the
// token's user id and answers 401 when it is gone, and the id is never reused.
// No refreshed token is ever handed out by this endpoint.
//
// Not done here (see the 2026-11-20 report): an active App Store / Google Play
// subscription is NOT cancelled (only the user can, in the store; the app says
// so before deleting), RevenueCat's customer record and PostHog's person
// record are not deleted server-side (no admin keys on the server).

import { ACCOUNT_DELETE_CONFIRM } from '../../src/lib/api/accountDeleteContract';
import {
  isRecord,
  missingToken,
  resolveCaller,
  type ApiResult,
  type CallerDeps,
  type CallerInput,
} from './callerAuth';

export interface AccountDeleteSummary {
  /** Rows deleted or anonymised per step (counts only, for the log line). */
  rows: Record<string, number>;
}

export interface AccountDeleteStore {
  /**
   * Delete the account and everything that identifies its owner, in ONE
   * transaction (all or nothing). null = no such account (already deleted).
   */
  deleteAccount(userId: string): Promise<AccountDeleteSummary | null>;
}

export interface AccountDeleteDeps extends CallerDeps {
  store: AccountDeleteStore;
  /** One structured line per outcome. Never an id or an email. */
  log?: (line: string) => void;
}

const defaultLog = (line: string) => console.info(line);

export async function handleAccountDelete(input: CallerInput, deps: AccountDeleteDeps): Promise<ApiResult> {
  const who = await resolveCaller(input, deps);
  if (!who.ok) return who.response;
  if (who.caller.kind === 'none') return missingToken();

  const body = isRecord(input.body) ? input.body : {};
  if (body.confirm !== ACCOUNT_DELETE_CONFIRM) {
    return { status: 400, body: { error: 'Missing deletion confirmation', code: 'CONFIRM_REQUIRED' } };
  }

  const log = deps.log ?? defaultLog;
  const summary = await deps.store.deleteAccount(who.caller.userId);
  if (!summary || (summary.rows.user_profiles ?? 0) === 0) {
    log(`[account-delete] ${JSON.stringify({ outcome: 'already_deleted' })}`);
    return { status: 200, body: { ok: true, deleted: false, alreadyDeleted: true } };
  }
  log(`[account-delete] ${JSON.stringify({ outcome: 'deleted', rows: summary.rows })}`);
  // Deliberately without who.caller.headers: no X-Auth-Refreshed-Token for an
  // account that no longer exists.
  return { status: 200, body: { ok: true, deleted: true } };
}
