// api/auth/email-code.ts — production entry for POST /api/auth/email-code.
// Logic: app/api/auth/email-code+api.ts → api/_shared/authVerify.ts.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { POST } from '../../app/api/auth/email-code+api';
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
