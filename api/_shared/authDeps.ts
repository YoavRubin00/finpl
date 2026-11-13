// api/_shared/authDeps.ts
// Production wiring for authVerify.ts: Neon stores, Apple's JWKS (cached per
// instance), global fetch for Google, Resend, the JWT session and the welcome
// email.

import {
  APPLE_JWKS_URL,
  getAppleAudiences,
  getEmailCodeSecret,
  getGoogleClientIds,
  parseAppleJwks,
  type AppleJwk,
} from './authProof';
import { createPgEmailCodeStore, createPgRateLimitStore } from './authStores';
import { findOrCreateProfileForCredential, type ProfileRow } from './authProfile';
import type { EmailCodeDeps, VerifyDeps } from './authVerify';
import { getDb } from './db';
import { signSession } from './jwt';
import { sendLoginCodeEmail } from './sendLoginCodeEmail';
import { sendWelcomeEmail } from './sendWelcomeEmail';

const APPLE_KEYS_TTL_MS = 6 * 60 * 60 * 1000;
// A token with an unknown kid may force a refetch, but not more than once a minute.
const APPLE_KEYS_MIN_REFRESH_MS = 60 * 1000;
let appleKeysCache: { keys: AppleJwk[]; fetchedAt: number } | null = null;

export async function getAppleKeys({ forceRefresh }: { forceRefresh: boolean }): Promise<AppleJwk[]> {
  const now = Date.now();
  if (appleKeysCache) {
    const age = now - appleKeysCache.fetchedAt;
    if (!forceRefresh && age < APPLE_KEYS_TTL_MS) return appleKeysCache.keys;
    if (forceRefresh && age < APPLE_KEYS_MIN_REFRESH_MS) return appleKeysCache.keys;
  }
  const res = await fetch(APPLE_JWKS_URL);
  if (!res.ok) {
    if (appleKeysCache) return appleKeysCache.keys;
    throw new Error(`Apple JWKS HTTP ${res.status}`);
  }
  const keys = parseAppleJwks(await res.json());
  if (keys.length === 0) {
    if (appleKeysCache) return appleKeysCache.keys;
    throw new Error('Apple JWKS returned no usable keys');
  }
  appleKeysCache = { keys, fetchedAt: now };
  return keys;
}

function isDeliverable(email: string | null): email is string {
  return !!email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function createVerifyDeps(): VerifyDeps<ProfileRow> {
  const db = getDb();
  return {
    emailCodes: createPgEmailCodeStore(db),
    rateLimits: createPgRateLimitStore(db),
    emailCodeSecret: getEmailCodeSecret,
    getAppleKeys,
    appleAudiences: getAppleAudiences(),
    googleClientIds: getGoogleClientIds(),
    fetchImpl: fetch,
    now: () => Date.now(),
    findOrCreateProfile: (cred) => findOrCreateProfileForCredential(db, cred),
    mintSession: (profile) => signSession({ sub: profile.id, authId: profile.authId }),
    afterSignIn: async (profile) => {
      // sendWelcomeEmail never throws and flips welcome_email_sent itself.
      if (!profile.welcomeEmailSent && isDeliverable(profile.email)) {
        await sendWelcomeEmail({ db, userId: profile.id, email: profile.email, displayName: profile.displayName });
      }
    },
  };
}

export function createEmailCodeDeps(): EmailCodeDeps {
  const db = getDb();
  return {
    emailCodes: createPgEmailCodeStore(db),
    rateLimits: createPgRateLimitStore(db),
    emailCodeSecret: getEmailCodeSecret,
    sendCode: (email, code, ttlMinutes) => sendLoginCodeEmail({ email, code, ttlMinutes }),
    now: () => Date.now(),
  };
}
