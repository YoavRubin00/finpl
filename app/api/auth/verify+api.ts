import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { randomBytes } from 'crypto';
import { userProfiles } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString, isValidEmail } from '../_shared/validate';

function getDb() {
  const url = process.env.DATABASE_URL ?? '';
  const sql = neon(url);
  return drizzle(sql);
}

interface GoogleUserInfo {
  email?: string;
  name?: string;
}

interface VerifyRequestBody {
  provider: 'google' | 'email' | 'apple';
  token?: string;
  email?: string;
  appleUserId?: string;
  displayName?: string;
}

export async function POST(request: Request): Promise<Response> {
  // Rate limit: 10 auth attempts per minute per IP
  const blocked = enforceRateLimit(request, 'auth-verify', { limit: 10, windowSec: 60 });
  if (blocked) return blocked;

  try {
    const body = (await request.json()) as VerifyRequestBody;
    const { provider, token } = body;

    let verifiedEmail: string | null = null;
    let verifiedName: string | null = null;

    if (provider === 'google') {
      if (!token) {
        return Response.json({ error: 'Missing Google token' }, { status: 400 });
      }
      const googleRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!googleRes.ok) {
        return Response.json({ error: 'Invalid Google token' }, { status: 401 });
      }
      const googleUser = (await googleRes.json()) as GoogleUserInfo;
      verifiedEmail = googleUser.email ?? null;
      verifiedName = googleUser.name ?? null;
    } else if (provider === 'email') {
      const email = sanitizeString(body.email, 254);
      if (!email || !isValidEmail(email)) {
        return Response.json({ error: 'Invalid email' }, { status: 400 });
      }
      verifiedEmail = email;
      verifiedName = sanitizeString(body.displayName, 100) ?? null;
    } else if (provider === 'apple') {
      // Apple hidden-email users get a stable identifier (not an email format).
      // We trust Apple's identifier as the authId — no server-side JWT verification.
      const appleId = sanitizeString(body.appleUserId ?? body.email, 254);
      if (!appleId) {
        return Response.json({ error: 'Missing Apple identifier' }, { status: 400 });
      }
      verifiedEmail = appleId;
      verifiedName = sanitizeString(body.displayName, 100) ?? null;
    } else {
      return Response.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    if (!verifiedEmail) {
      return Response.json({ error: 'Could not verify email' }, { status: 401 });
    }

    // Sanitize display name from Google too
    verifiedName = sanitizeString(verifiedName, 100) ?? null;

    const db = getDb();

    // Only save as email if it looks like one (Apple hidden-email users have stable IDs, not emails)
    const emailForDb = isValidEmail(verifiedEmail) ? verifiedEmail : null;

    await db
      .insert(userProfiles)
      .values({
        authId: verifiedEmail,
        displayName: verifiedName,
        email: emailForDb,
      })
      .onConflictDoUpdate({
        target: userProfiles.authId,
        set: {
          displayName: verifiedName ?? undefined,
          updatedAt: new Date().toISOString(),
        },
      });

    const rows = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.authId, verifiedEmail))
      .limit(1);

    let profile = rows[0] ?? null;

    // Generate syncToken if not yet set — returned to client for all future sync calls
    let syncToken = profile?.syncToken ?? null;
    if (!syncToken) {
      syncToken = randomBytes(32).toString('hex');
      await db.update(userProfiles).set({ syncToken }).where(eq(userProfiles.authId, verifiedEmail));
    }

    // Security log
    console.info(`[auth] verify ok: provider=${provider} email=${verifiedEmail}`);

    return Response.json({ ok: true, profile, syncToken });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'auth/verify');
  }
}
