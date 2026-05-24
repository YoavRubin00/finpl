import { GET } from '../../app/api/market/live+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
