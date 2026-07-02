import { GET } from '../../app/api/market/news-quiz+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
