import { GET, POST } from '../../app/api/portfolio-share/feed+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET, POST });
