import { GET, POST } from '../../app/api/journal/events+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET, POST });
