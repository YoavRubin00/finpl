// api/bridge/redeem.ts — production entry for POST /api/bridge/redeem.
// Logic: app/api/bridge/redeem+api.ts → api/_shared/bridgeRedeem.ts.
import { POST } from '../../app/api/bridge/redeem+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
