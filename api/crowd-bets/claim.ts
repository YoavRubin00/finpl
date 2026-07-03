import { POST } from '../../app/api/crowd-bets/claim+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
