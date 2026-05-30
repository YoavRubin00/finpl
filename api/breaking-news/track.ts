import { POST, DELETE } from '../../app/api/breaking-news/track+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST, DELETE });
