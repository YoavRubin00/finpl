import { POST } from '../../app/api/daily-news-challenge/chat+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
