import { POST } from '../../app/api/anon-advice/rephrase+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
