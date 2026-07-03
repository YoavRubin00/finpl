import { GET } from '../../app/api/crowd-bets/settle+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
