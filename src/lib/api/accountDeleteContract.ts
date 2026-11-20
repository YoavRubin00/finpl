// src/lib/api/accountDeleteContract.ts
//
// Shared by the app (src/lib/api/account.ts) and the server
// (api/_shared/accountDelete.ts). Dependency-free on purpose: the server
// imports it, so it must not pull in React Native modules.

/** POST /api/account/delete refuses any body without exactly this `confirm`. */
export const ACCOUNT_DELETE_CONFIRM = 'DELETE_MY_ACCOUNT';

/** 200 answer. `deleted: false, alreadyDeleted: true` = this session's account
 *  was already gone (a retry after a lost answer): nothing left to delete. */
export interface AccountDeleteResponse {
  ok: true;
  deleted: boolean;
  alreadyDeleted?: boolean;
}
