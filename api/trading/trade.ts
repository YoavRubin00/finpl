// api/trading/trade.ts — production entry for POST /api/trading/trade.
// All logic lives in app/api/trading/trade+api.ts → api/_shared/paperTrade.ts,
// so the Expo dev server and Vercel run the same checks. Until 2026-11-20 this
// file didn't exist and every paper trade the app sent got a 404.
import { POST } from '../../app/api/trading/trade+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
