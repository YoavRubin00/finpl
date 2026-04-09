import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
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
  provider: 'google' | 'email';
  token?: string;
  email?: string;
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
    } else {
      return Response.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    if (!verifiedEmail) {
      return Response.json({ error: 'Could not verify email' }, { status: 401 });
    }

    // Sanitize display name from Google too
    verifiedName = sanitizeString(verifiedName, 100) ?? null;

    const db = getDb();

    await db
      .insert(userProfiles)
      .values({
        authId: verifiedEmail,
        displayName: verifiedName,
        email: verifiedEmail,
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

    const profile = rows[0] ?? null;

    // Security log
    console.info(`[auth] verify ok: provider=${provider} email=${verifiedEmail}`);

    return Response.json({ ok: true, profile });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'auth/verify');
  }
}
