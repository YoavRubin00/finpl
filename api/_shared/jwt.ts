// api/_shared/jwt.ts
import jwt from 'jsonwebtoken';

export interface SessionPayload {
  sub: string;     // userProfiles.id (uuid)
  authId: string;  // email
}

export interface SessionPayloadDecoded extends SessionPayload {
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const REFRESH_WINDOW_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error('AUTH_JWT_SECRET is not configured');
  }
  return secret;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

export function verifySession(token: string): SessionPayloadDecoded {
  const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
    throw new Error('Invalid token payload');
  }
  const obj = decoded as Record<string, unknown>;
  if (typeof obj.sub !== 'string' || typeof obj.authId !== 'string'
      || typeof obj.iat !== 'number' || typeof obj.exp !== 'number') {
    throw new Error('Token missing required fields');
  }
  return { sub: obj.sub, authId: obj.authId, iat: obj.iat, exp: obj.exp };
}

export function shouldRefresh(decoded: SessionPayloadDecoded): boolean {
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp - now < REFRESH_WINDOW_SECONDS;
}
