import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { randomBytes } from 'crypto';
import { userProfiles, moduleProgress } from '../../../src/db/schema';
import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sendWelcomeEmail } from '../../../api/_shared/sendWelcomeEmail';
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
    let appleEmailFromClient: string | null = null;

    if (provider === 'google') {
      if (!token) {
        return Response.json({ error: 'Missing Google token' }, { status: 400 });
      }
      const dotCount = (token.match(/\./g) ?? []).length;
      const isJwt = dotCount === 2;
      console.info(`[auth/verify] google token: kind=${isJwt ? 'JWT/id_token' : 'opaque/access_token'} dots=${dotCount} length=${token.length} prefix=${token.slice(0, 12)}...`);

      if (isJwt) {
        // id_token — validate via tokeninfo endpoint
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
        if (!tokenInfoRes.ok) {
          const errBody = await tokenInfoRes.text().catch(() => '<unreadable>');
          console.warn(`[auth/verify] google tokeninfo rejected: status=${tokenInfoRes.status} body=${errBody.slice(0, 200)}`);
          return Response.json({ error: 'Invalid Google token' }, { status: 401 });
        }
        const tokenInfo = (await tokenInfoRes.json()) as { email?: string; name?: string; given_name?: string; family_name?: string };
        verifiedEmail = tokenInfo.email ?? null;
        verifiedName = tokenInfo.name ?? (tokenInfo.given_name ? `${tokenInfo.given_name} ${tokenInfo.family_name ?? ''}`.trim() : null);
        console.info(`[auth/verify] google tokeninfo ok: email=${verifiedEmail}`);
      } else {
        // access_token — validate via userinfo endpoint
        const googleRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!googleRes.ok) {
          const errBody = await googleRes.text().catch(() => '<unreadable>');
          console.warn(`[auth/verify] google userinfo rejected: status=${googleRes.status} body=${errBody.slice(0, 200)}`);
          return Response.json({ error: 'Invalid Google token' }, { status: 401 });
        }
        const googleUser = (await googleRes.json()) as GoogleUserInfo;
        verifiedEmail = googleUser.email ?? null;
        verifiedName = googleUser.name ?? null;
        console.info(`[auth/verify] google userinfo ok: email=${verifiedEmail}`);
      }
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
      const appleUserId = sanitizeString(body.appleUserId, 254);
      if (!appleUserId) {
        return Response.json({ error: 'Missing Apple identifier' }, { status: 400 });
      }
      verifiedEmail = appleUserId; // used as authId below
      verifiedName = sanitizeString(body.displayName, 100) ?? null;
      appleEmailFromClient = sanitizeString(body.email, 254) ?? null;
    } else {
      return Response.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    if (!verifiedEmail) {
      return Response.json({ error: 'Could not verify email' }, { status: 401 });
    }

    // Sanitize display name from Google too
    verifiedName = sanitizeString(verifiedName, 100) ?? null;

    const db = getDb();

    // ── Apple legacy authId migration ──
    // Before fix: client used credential.email as authId. Apple only returns
    // email on FIRST sign-in, so subsequent sign-ins produced a different
    // authId (credential.user) and created an orphan row. If the legacy row
    // (authId = email) exists and no row yet exists for the stable Apple ID,
    // transfer the row by updating its authId. Only runs when email was
    // provided by the client (i.e. Apple returned it — typically only on
    // sign-ins where the user re-granted access via iOS Settings).
    if (provider === 'apple' && appleEmailFromClient && isValidEmail(appleEmailFromClient)) {
      const byStableId = await db
        .select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.authId, verifiedEmail))
        .limit(1);
      if (byStableId.length === 0) {
        const byEmail = await db
          .select({ id: userProfiles.id })
          .from(userProfiles)
          .where(eq(userProfiles.authId, appleEmailFromClient))
          .limit(1);
        if (byEmail.length > 0) {
          try {
            await db
              .update(userProfiles)
              .set({ authId: verifiedEmail, updatedAt: new Date().toISOString() })
              .where(eq(userProfiles.authId, appleEmailFromClient));
            console.info(`[auth/verify] migrated Apple authId from email to stable ID for user ${byEmail[0].id}`);
          } catch (migErr) {
            console.warn('[auth/verify] Apple migration failed:', migErr);
          }
        }
      }
    }

    // Email stored in the DB: Google/email providers use the verified email,
    // Apple uses the explicit email from the client (verifiedEmail is the
    // stable Apple ID, not an email format).
    const emailForDb =
      provider === 'apple'
        ? (appleEmailFromClient && isValidEmail(appleEmailFromClient) ? appleEmailFromClient : null)
        : (isValidEmail(verifiedEmail) ? verifiedEmail : null);

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

    // First-time welcome email: only sent if the row was just created (welcomeEmailSent=false)
    // and we have a real deliverable address (Apple hidden-ID users have emailForDb=null).
    // sendWelcomeEmail catches all errors and never throws — safe to await.
    if (profile && !profile.welcomeEmailSent && emailForDb) {
      await sendWelcomeEmail({
        db,
        userId: profile.id,
        email: emailForDb,
        displayName: profile.displayName ?? verifiedName,
      });
    }

    // Derive hasCompletedOnboarding from server state. The user_profiles table has
    // no dedicated column for this, so we use module-progress as the source of
    // truth: ANY existing module-progress row means the user has already passed
    // the onboarding flow that funnels into mod-0-1 (they reached at least the
    // first lesson). Previously we required a 'completed' row, which forced
    // returning users who started mod-0-1 but didn't finish a single module
    // back through onboarding — they reported (2026-06-03) "signed in with
    // Google → ended up at dream step again". Drop the status filter so any
    // recorded progress (started / in-progress / completed) counts as
    // "passed onboarding".
    let hasCompletedOnboarding = false;
    if (profile) {
      const progressRows = await db
        .select({ id: moduleProgress.id })
        .from(moduleProgress)
        .where(eq(moduleProgress.userId, profile.id))
        .limit(1);
      hasCompletedOnboarding = progressRows.length > 0;
    }
    const profileWithFlag = profile ? { ...profile, hasCompletedOnboarding } : null;

    // Security log
    console.info(`[auth] verify ok: provider=${provider} email=${verifiedEmail} returning=${hasCompletedOnboarding}`);

    return Response.json({ ok: true, profile: profileWithFlag, syncToken });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'auth/verify');
  }
}
