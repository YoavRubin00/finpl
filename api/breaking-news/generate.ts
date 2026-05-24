import { POST } from '../../app/api/breaking-news/generate+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
