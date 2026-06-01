import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../src/db/schema';
import { sendWelcomeEmail } from '../_shared/sendWelcomeEmail';
import { signSession } from '../_shared/jwt';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  return drizzle(neon(url));
}

interface VerifyRequestBody {
  provider: 'google' | 'email' | 'apple';
  token?: string;        // google access_token or id_token
  email?: string;        // email provider, or Apple's first-login email
  appleUserId?: string;  // Apple stable subject (credential.user)
  displayName?: string;
}

interface ResolvedCredential {
  provider: 'google' | 'email' | 'apple';
  subject: string;        // google sub | apple sub | email (for email provider)
  email: string | null;   // deliverable email if known
  emailVerified: boolean; // true only for provider-verified emails (google/apple)
  displayName: string | null;
}

function isEmail(s: string | null | undefined): s is string {
  return !!s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && s.length <= 254;
}

async function resolveGoogle(token: string): Promise<ResolvedCredential | null> {
  const isJwt = (token.match(/\./g) ?? []).length === 2;
  if (isJwt) {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (!r.ok) return null;
    const info = (await r.json()) as { sub?: string; email?: string; name?: string };
    if (!info.sub) return null;
    return { provider: 'google', subject: info.sub, email: info.email ?? null, emailVerified: true, displayName: info.name ?? null };
  }
  const r = await fetch('https://www.googleapis.com/userinfo/v2/me', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const info = (await r.json()) as { id?: string; email?: string; name?: string };
  if (!info.id) return null;
  return { provider: 'google', subject: info.id, email: info.email ?? null, emailVerified: true, displayName: info.name ?? null };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body as VerifyRequestBody;
    let cred: ResolvedCredential | null = null;

    if (body.provider === 'google') {
      if (!body.token) return res.status(400).json({ error: 'Missing Google token' });
      cred = await resolveGoogle(body.token);
      if (!cred) return res.status(401).json({ error: 'Invalid Google token' });
    } else if (body.provider === 'apple') {
      if (!body.appleUserId) return res.status(400).json({ error: 'Missing Apple identifier' });
      cred = {
        provider: 'apple',
        subject: body.appleUserId,
        email: isEmail(body.email) ? body.email : null,
        emailVerified: true,
        displayName: body.displayName ?? null,
      };
    } else if (body.provider === 'email') {
      if (!isEmail(body.email)) return res.status(400).json({ error: 'Invalid email' });
      cred = {
        provider: 'email',
        subject: body.email,
        email: body.email,
        emailVerified: false,
        displayName: body.displayName ?? null,
      };
    } else {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    const db = getDb();

    // 1. Find by provider subject.
    let row: typeof userProfiles.$inferSelect | undefined =
      cred.provider === 'google'
        ? (await db.select().from(userProfiles).where(eq(userProfiles.googleSub, cred.subject)).limit(1))[0]
        : cred.provider === 'apple'
        ? (await db.select().from(userProfiles).where(eq(userProfiles.appleSub, cred.subject)).limit(1))[0]
        : (await db.select().from(userProfiles).where(eq(userProfiles.email, cred.subject)).limit(1))[0];

    // I3: passwordless email login must not land on a row owned by an OAuth
    // provider (Google/Apple set `email`, so otherwise someone could log in as
    // a Google user just by typing their address). Pure-email users have both
    // subs NULL and are unaffected. We reject with a 409 directing the user to
    // their social login rather than fall through to create — creating would
    // hit the `email` UNIQUE constraint and 500. (Full fix is OTP-verified
    // email — tracked separately; this preserves the pre-unification boundary.)
    if (cred.provider === 'email' && row && (row.googleSub || row.appleSub)) {
      const method = row.googleSub ? 'Google' : 'Apple';
      return res.status(409).json({
        error: `This email is registered with ${method} sign-in. Please continue with ${method}.`,
        code: 'USE_SOCIAL_LOGIN',
        provider: row.googleSub ? 'google' : 'apple',
      });
    }

    // 2. Auto-link: a verified credential whose email matches an existing row
    //    attaches its subject to that row. Safe because the provider proved the
    //    user controls the address. Unverified (email-provider) logins skip this.
    if (!row && cred.emailVerified && isEmail(cred.email)) {
      const byEmail = (await db.select().from(userProfiles).where(eq(userProfiles.email, cred.email)).limit(1))[0];
      if (byEmail) {
        await db.update(userProfiles).set({
          googleSub: cred.provider === 'google' ? cred.subject : byEmail.googleSub,
          appleSub: cred.provider === 'apple' ? cred.subject : byEmail.appleSub,
          emailVerified: true,
          displayName: byEmail.displayName ?? cred.displayName ?? undefined,
          updatedAt: new Date().toISOString(),
        }).where(eq(userProfiles.id, byEmail.id));
        row = (await db.select().from(userProfiles).where(eq(userProfiles.id, byEmail.id)).limit(1))[0];
      }
    }

    // 1c. Legacy rows predate the google_sub/apple_sub columns: an existing
    //     Apple user has auth_id = <Apple subject> (apple_sub still NULL), and a
    //     legacy Google/email user has auth_id = <email>. Find them by the legacy
    //     auth_id key and backfill the subject onto the row, so we attach to the
    //     SAME uuid instead of creating a duplicate (which would 500 on the
    //     auth_id UNIQUE constraint and orphan the user's progress).
    if (!row) {
      const legacyKey = isEmail(cred.email) ? cred.email : cred.subject;
      const legacy = (await db.select().from(userProfiles).where(eq(userProfiles.authId, legacyKey)).limit(1))[0];
      if (legacy && !(cred.provider === 'email' && (legacy.googleSub || legacy.appleSub))) {
        await db.update(userProfiles).set({
          googleSub: cred.provider === 'google' ? cred.subject : legacy.googleSub,
          appleSub: cred.provider === 'apple' ? cred.subject : legacy.appleSub,
          email: legacy.email ?? (isEmail(cred.email) ? cred.email : legacy.email),
          updatedAt: new Date().toISOString(),
        }).where(eq(userProfiles.id, legacy.id));
        row = (await db.select().from(userProfiles).where(eq(userProfiles.id, legacy.id)).limit(1))[0];
      }
    }

    // 3. Create. authId stays populated (NOT NULL + legacy email-login path):
    //    use the email when present, else the provider subject (stable, unique).
    if (!row) {
      const authId = isEmail(cred.email) ? cred.email : cred.subject;
      await db.insert(userProfiles).values({
        authId,
        email: isEmail(cred.email) ? cred.email : null,
        emailVerified: cred.emailVerified,
        displayName: cred.displayName,
        googleSub: cred.provider === 'google' ? cred.subject : null,
        appleSub: cred.provider === 'apple' ? cred.subject : null,
      }).onConflictDoNothing({ target: userProfiles.authId });
      row = (await db.select().from(userProfiles).where(eq(userProfiles.authId, authId)).limit(1))[0];
    } else if (cred.provider === 'email' && cred.displayName && !row.displayName) {
      await db.update(userProfiles).set({ displayName: cred.displayName, updatedAt: new Date().toISOString() }).where(eq(userProfiles.id, row.id));
      row = (await db.select().from(userProfiles).where(eq(userProfiles.id, row.id)).limit(1))[0];
    }

    if (!row) return res.status(500).json({ error: 'Profile lookup failed after upsert' });

    if (!row.welcomeEmailSent && isEmail(row.email)) {
      await sendWelcomeEmail({ db, userId: row.id, email: row.email, displayName: row.displayName });
    }

    const token = signSession({ sub: row.id, authId: row.authId });
    return res.status(200).json({ ok: true, profile: row, token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
