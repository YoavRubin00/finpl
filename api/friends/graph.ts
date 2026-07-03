import { GET, POST } from '../../app/api/friends/graph+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET, POST });
