// api/_shared/authProfile.ts
//
// Find or create the user_profiles row for a VERIFIED credential (see
// authVerify.ts). Ported from the previous api/auth/verify.ts with these
// changes (2026-11-13):
//   - An email is only used to find or link a row when the provider proved it
//     (email code, Apple's signed token, Google's email_verified). The client's
//     own `email` field is never used.
//   - Email lookups are case-insensitive (exact match first); email accounts
//     are keyed on the lowercased address from now on.
//   - The "email login may not land on a Google/Apple row" 409 guard is gone:
//     it stood in for proof of ownership, which the code now provides.
//   - Legacy rows (auth_id = Apple subject, or auth_id = email) are looked up
//     by both keys, so Apple tokens that now always carry the email still find
//     an old auth_id = <subject> row.

import { asc, eq, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../src/db/schema';
import type { ResolvedCredential } from './authVerify';

export type ProfileRow = typeof userProfiles.$inferSelect;

function looksLikeEmail(s: string | null | undefined): s is string {
  return !!s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && s.length <= 254;
}

async function byId(db: NeonHttpDatabase, id: string): Promise<ProfileRow | undefined> {
  return (await db.select().from(userProfiles).where(eq(userProfiles.id, id)).limit(1))[0];
}

async function byEmail(db: NeonHttpDatabase, email: string): Promise<ProfileRow | undefined> {
  const exact = (await db.select().from(userProfiles).where(eq(userProfiles.email, email)).limit(1))[0];
  if (exact) return exact;
  return (
    await db
      .select()
      .from(userProfiles)
      .where(sql`lower(${userProfiles.email}) = ${email.toLowerCase()}`)
      .orderBy(asc(userProfiles.createdAt))
      .limit(1)
  )[0];
}

async function byAuthId(db: NeonHttpDatabase, key: string): Promise<ProfileRow | undefined> {
  const exact = (await db.select().from(userProfiles).where(eq(userProfiles.authId, key)).limit(1))[0];
  if (exact || !looksLikeEmail(key)) return exact;
  return (
    await db
      .select()
      .from(userProfiles)
      .where(sql`lower(${userProfiles.authId}) = ${key.toLowerCase()}`)
      .orderBy(asc(userProfiles.createdAt))
      .limit(1)
  )[0];
}

export async function findOrCreateProfileForCredential(
  db: NeonHttpDatabase,
  cred: ResolvedCredential,
): Promise<ProfileRow | null> {
  const verifiedEmail = cred.emailVerified && looksLikeEmail(cred.email) ? cred.email : null;

  // 1. Find by provider subject.
  let row: ProfileRow | undefined =
    cred.provider === 'google'
      ? (await db.select().from(userProfiles).where(eq(userProfiles.googleSub, cred.subject)).limit(1))[0]
      : cred.provider === 'apple'
        ? (await db.select().from(userProfiles).where(eq(userProfiles.appleSub, cred.subject)).limit(1))[0]
        : await byEmail(db, cred.subject);

  // 2. Auto-link: a provider-verified email that matches an existing row
  //    attaches this provider's subject to that row. (Email sign-in already
  //    looked up by email in step 1.) Writing cred.subject cannot collide on the
  //    google_sub/apple_sub UNIQUE index: step 1 looked up that exact subject
  //    and missed. A race between two first logins of the same new subject
  //    surfaces as a retryable 500, not corruption.
  if (!row && verifiedEmail && cred.provider !== 'email') {
    const existing = await byEmail(db, verifiedEmail);
    if (existing) {
      await db.update(userProfiles).set({
        googleSub: cred.provider === 'google' ? cred.subject : existing.googleSub,
        appleSub: cred.provider === 'apple' ? cred.subject : existing.appleSub,
        emailVerified: true,
        displayName: existing.displayName ?? cred.displayName ?? undefined,
        updatedAt: new Date().toISOString(),
      }).where(eq(userProfiles.id, existing.id));
      row = await byId(db, existing.id);
    }
  }

  // 3. Legacy rows predate google_sub/apple_sub: an Apple user may have
  //    auth_id = <Apple subject> (after the June fix) or auth_id = <email>
  //    (before it); a Google/email user has auth_id = <email>. Backfill the
  //    subject onto the SAME uuid instead of creating a duplicate (which would
  //    500 on the auth_id UNIQUE constraint and orphan the user's progress).
  if (!row) {
    const keys = Array.from(new Set([cred.subject, verifiedEmail].filter((k): k is string => !!k)));
    for (const key of keys) {
      const legacy = await byAuthId(db, key);
      if (!legacy) continue;
      await db.update(userProfiles).set({
        googleSub: cred.provider === 'google' ? cred.subject : legacy.googleSub,
        appleSub: cred.provider === 'apple' ? cred.subject : legacy.appleSub,
        email: legacy.email ?? verifiedEmail,
        updatedAt: new Date().toISOString(),
      }).where(eq(userProfiles.id, legacy.id));
      row = await byId(db, legacy.id);
      if (legacy.authId !== cred.subject) {
        console.info(`[auth] linked legacy row by auth_id: provider=${cred.provider} user=${legacy.id}`);
      }
      break;
    }
  }

  // 4. Create. auth_id stays populated (NOT NULL): the verified email when
  //    there is one, else the provider subject (stable, unique).
  if (!row) {
    const authId = verifiedEmail ?? cred.subject;
    await db.insert(userProfiles).values({
      authId,
      email: verifiedEmail,
      emailVerified: verifiedEmail !== null,
      displayName: cred.displayName,
      googleSub: cred.provider === 'google' ? cred.subject : null,
      appleSub: cred.provider === 'apple' ? cred.subject : null,
    }).onConflictDoNothing({ target: userProfiles.authId });
    row = (await db.select().from(userProfiles).where(eq(userProfiles.authId, authId)).limit(1))[0];
  } else if (cred.provider === 'email' && (!row.emailVerified || (cred.displayName && !row.displayName))) {
    await db.update(userProfiles).set({
      emailVerified: true,
      displayName: row.displayName ?? cred.displayName ?? undefined,
      updatedAt: new Date().toISOString(),
    }).where(eq(userProfiles.id, row.id));
    row = await byId(db, row.id);
  }

  return row ?? null;
}
