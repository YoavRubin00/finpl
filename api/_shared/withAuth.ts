// api/_shared/withAuth.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySession, signSession, shouldRefresh, type SessionPayloadDecoded } from './jwt';

export interface AuthContext {
  authId: string;
  userId: string;
  decoded: SessionPayloadDecoded;
}

export type AuthedHandler = (
  req: VercelRequest,
  res: VercelResponse,
  ctx: AuthContext,
) => Promise<void | VercelResponse> | void | VercelResponse;

export function withAuth(handler: AuthedHandler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const authHeader = req.headers.authorization ?? '';
    const match = /^Bearer (.+)$/.exec(authHeader);
    if (!match) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = match[1];

    let decoded: SessionPayloadDecoded;
    try {
      decoded = verifySession(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (shouldRefresh(decoded)) {
      const refreshed = signSession({ sub: decoded.sub, authId: decoded.authId });
      res.setHeader('X-Auth-Refreshed-Token', refreshed);
    }

    return handler(req, res, {
      authId: decoded.authId,
      userId: decoded.sub,
      decoded,
    });
  };
}
