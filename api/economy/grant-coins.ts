import { POST } from '../../app/api/economy/grant-coins+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
