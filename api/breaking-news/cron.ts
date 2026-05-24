import { GET } from '../../app/api/breaking-news/cron+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
