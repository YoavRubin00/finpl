/**
 * Client store + API wrappers for the parental-consent flow.
 *
 * Persists the most recently known status in MMKV so the user (the minor)
 * doesn't see a flash of "needs parental consent" while the network call
 * is in flight on cold start. Refreshes from the server lazily — when the
 * paywall is opened, or when the user comes back from background.
 *
 * Status semantics for the UI:
 *   'none'      — no consent has ever been requested → show "enter parent email"
 *   'pending'   — request sent, awaiting parent click → show "we sent an email"
 *   'confirmed' — parent clicked confirm → unlock Pro purchase
 *   'revoked'   — parent clicked revoke at any point → re-block Pro purchase
 *   'expired'   — 14 days passed without confirmation → fall back to 'none'-like
 *                 UX (offer to request again)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../../lib/zustandStorage';
import { getApiBase } from '../../db/apiBase';
import { useAuthStore } from '../auth/useAuthStore';
import { tokenStore } from '../../lib/auth/secureStore';

export type ParentalConsentStatus =
  | 'none'
  | 'pending'
  | 'confirmed'
  | 'revoked'
  | 'expired';

interface ParentalConsentSnapshot {
  status: ParentalConsentStatus;
  /** Masked parent email returned by the server, e.g. 'a***@gmail.com'. */
  parentEmail: string | null;
  requestedAt: string | null;
  confirmedAt: string | null;
  expiresAt: string | null;
  /** Local timestamp of the last server fetch — to throttle polling. */
  lastFetchedAt: number | null;
}

interface ParentalConsentState extends ParentalConsentSnapshot {
  /**
   * Send a parental-consent request to the server. The server creates the
   * row + sends the email. We immediately reflect status='pending' so the
   * UI updates without a round-trip; the next refreshStatus() will reconcile.
   */
  requestConsent: (parentEmail: string) => Promise<{ ok: boolean; error?: string }>;
  /** Refetch status from server. Throttled to once per 30 seconds. */
  refreshStatus: (opts?: { force?: boolean }) => Promise<void>;
  /** Clear local snapshot — used by sign-out / account-delete. */
  reset: () => void;
}

const EMPTY: ParentalConsentSnapshot = {
  status: 'none',
  parentEmail: null,
  requestedAt: null,
  confirmedAt: null,
  expiresAt: null,
  lastFetchedAt: null,
};

const MIN_REFETCH_MS = 30 * 1000;

interface StatusResponse {
  status: ParentalConsentStatus;
  parentEmail?: string;
  requestedAt?: string;
  confirmedAt?: string | null;
  expiresAt?: string;
}

interface RequestResponse {
  ok: boolean;
  status: ParentalConsentStatus;
  emailSent: boolean;
  parentEmail: string;
}

async function getAuthOrNull(): Promise<{ authId: string; syncToken: string } | null> {
  const { email } = useAuthStore.getState();
  if (!email) return null;
  const token = (await tokenStore.get()) ?? '';
  return { authId: email, syncToken: token };
}

export const useParentalConsentStore = create<ParentalConsentState>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      requestConsent: async (parentEmail) => {
        const auth = await getAuthOrNull();
        if (!auth) return { ok: false, error: 'not_authenticated' };

        const base = getApiBase();
        try {
          const res = await fetch(`${base}/api/legal/parental-consent-request`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sync-Token': auth.syncToken,
            },
            body: JSON.stringify({ authId: auth.authId, parentEmail }),
          });
          if (!res.ok) {
            const errBody = (await res.json().catch(() => ({}))) as { error?: string };
            return { ok: false, error: errBody.error ?? `http_${res.status}` };
          }
          const data = (await res.json()) as RequestResponse;
          set({
            status: 'pending',
            parentEmail: data.parentEmail,
            requestedAt: new Date().toISOString(),
            confirmedAt: null,
            expiresAt: null,
            lastFetchedAt: Date.now(),
          });
          return { ok: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { ok: false, error: msg };
        }
      },

      refreshStatus: async (opts) => {
        const auth = await getAuthOrNull();
        if (!auth) return;

        const { lastFetchedAt } = get();
        if (!opts?.force && lastFetchedAt && Date.now() - lastFetchedAt < MIN_REFETCH_MS) {
          return; // throttled
        }

        const base = getApiBase();
        try {
          const url = `${base}/api/legal/parental-consent-status?authId=${encodeURIComponent(auth.authId)}`;
          const res = await fetch(url, {
            headers: { 'X-Sync-Token': auth.syncToken },
          });
          if (!res.ok) return; // silent — keep last known snapshot
          const data = (await res.json()) as StatusResponse;
          set({
            status: data.status,
            parentEmail: data.parentEmail ?? null,
            requestedAt: data.requestedAt ?? null,
            confirmedAt: data.confirmedAt ?? null,
            expiresAt: data.expiresAt ?? null,
            lastFetchedAt: Date.now(),
          });
        } catch {
          // Network errors are swallowed — UI falls back to the persisted snapshot.
        }
      },

      reset: () => set({ ...EMPTY }),
    }),
    {
      name: 'finplay-parental-consent',
      storage: createJSONStorage(() => zustandStorage),
    },
  ),
);

/** True if this user currently has an active, parent-confirmed consent on
 *  file. This is the gate the PricingScreen checks before allowing a
 *  minor to purchase Pro. */
export function selectHasActiveParentalConsent(s: ParentalConsentState): boolean {
  if (s.status !== 'confirmed') return false;
  if (s.expiresAt && new Date(s.expiresAt) < new Date()) return false;
  return true;
}
