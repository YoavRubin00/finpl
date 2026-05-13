import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { userProfiles } from '../../src/db/schema';
import { sendWelcomeEmail } from '../../app/api/_shared/sendWelcomeEmail';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as VerifyRequestBody;
    const { provider, token, email, displayName } = body;

    let verifiedEmail: string | null = null;
    let verifiedName: string | null = null;

    if (provider === 'google') {
      if (!token) {
        return res.status(400).json({ error: 'Missing Google token' });
      }
      const googleRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!googleRes.ok) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }
      const googleUser = (await googleRes.json()) as GoogleUserInfo;
      verifiedEmail = googleUser.email ?? null;
      verifiedName = googleUser.name ?? null;
    } else if (provider === 'email') {
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }
      verifiedEmail = email;
      verifiedName = displayName ?? null;
    } else {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    if (!verifiedEmail) {
      return res.status(401).json({ error: 'Could not verify email' });
    }

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

    // First-time welcome email: only sent if the row was just created (welcomeEmailSent=false)
    // and we have a deliverable email. sendWelcomeEmail catches all errors and never throws.
    if (profile && !profile.welcomeEmailSent && profile.email) {
      await sendWelcomeEmail({
        db,
        userId: profile.id,
        email: profile.email,
        displayName: profile.displayName ?? verifiedName,
      });
    }

    return res.status(200).json({ ok: true, profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(500).json({ error: message });
  }
}
