import { GET } from '../../app/api/breaking-news/list+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
