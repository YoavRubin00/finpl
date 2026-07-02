import { GET, POST } from '../../app/api/bar/content+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET, POST });
