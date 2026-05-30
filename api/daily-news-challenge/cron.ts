import { GET } from '../../app/api/daily-news-challenge/cron+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
