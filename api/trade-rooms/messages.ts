import { GET, POST } from '../../app/api/trade-rooms/messages+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET, POST });
