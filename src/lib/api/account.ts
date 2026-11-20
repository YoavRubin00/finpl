// src/lib/api/account.ts
import { api } from './client';
import { ACCOUNT_DELETE_CONFIRM, type AccountDeleteResponse } from './accountDeleteContract';

/**
 * POST /api/account/delete for the session's user (the shared client attaches
 * the token; without one it throws ApiError 401 locally and sends nothing).
 * Throws ApiError on any non-2xx answer; resolves only once the server has
 * deleted the account (or found it already deleted).
 */
export function deleteAccountOnServer(): Promise<AccountDeleteResponse> {
  return api.post<{ confirm: string }, AccountDeleteResponse>('/api/account/delete', {
    confirm: ACCOUNT_DELETE_CONFIRM,
  });
}
