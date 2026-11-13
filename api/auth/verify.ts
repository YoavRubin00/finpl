// api/auth/verify.ts — production entry for POST /api/auth/verify.
// All logic lives in app/api/auth/verify+api.ts → api/_shared/authVerify.ts,
// so the Expo dev server and Vercel run the same checks.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { POST } from '../../app/api/auth/verify+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

const handle = toVercelHandler({ POST });

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  await handle(req, res);
}
