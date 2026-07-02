import { POST } from '../../app/api/crowd-bets/place+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
