// api/auth/refresh.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withAuth } from '../_shared/withAuth';
import { signSession } from '../_shared/jwt';

export default withAuth(async (_req: VercelRequest, res: VercelResponse, ctx) => {
  const token = signSession({ sub: ctx.userId, authId: ctx.authId });
  return res.status(200).json({ ok: true, token });
});
