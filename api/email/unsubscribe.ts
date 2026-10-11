import type { VercelRequest, VercelResponse } from '@vercel/node';
import { unsubscribeUser } from '../_shared/sendDailyEmails';

/** GET  /api/email/unsubscribe?id=<userId> — opts a user out of daily emails (link in the footer).
 *  POST /api/email/unsubscribe?id=<userId> — RFC 8058 one-click unsubscribe (List-Unsubscribe-Post
 *  header, 11.10.26). Gmail/Yahoo call it with no body we need; a plain 200 is the contract. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = typeof req.query.id === 'string' ? req.query.id : null;
  if (!userId) {
    return res.status(400).send('Missing id');
  }

  try {
    await unsubscribeUser(userId);
  } catch (err: unknown) {
    console.error('[unsubscribe] failed', err);
    return res.status(500).send('Could not unsubscribe — please try again or reply to the email.');
  }

  if (req.method === 'POST') return res.status(200).send('OK');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(
    `<!DOCTYPE html><html dir="rtl" lang="he"><body style="font-family:Arial;text-align:center;padding:60px;color:#374151;">
      <h2>הוסרת בהצלחה מרשימת התפוצה</h2>
      <p>לא תקבל יותר אימיילים יומיים מ-FinPlay.</p>
    </body></html>`,
  );
}
