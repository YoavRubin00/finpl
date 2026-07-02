import { GET } from '../../app/api/crowd-bets/odds+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
