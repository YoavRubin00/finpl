import { POST } from '../../app/api/anon-advice/moderate+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
