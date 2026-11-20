// api/users/ping.ts — production entry for POST /api/users/ping.
// All logic lives in app/api/users/ping+api.ts → api/_shared/userPing.ts, so
// the Expo dev server and Vercel run the same checks. Until 2026-11-20 this
// file updated whatever account the body's `authId` named, unauthenticated.
import { POST } from '../../app/api/users/ping+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
