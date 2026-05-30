import { toVercelHandler } from '../_shared/webHandlerAdapter';
import { POST } from '../../app/api/voice/token+api';

export default toVercelHandler({ POST });
