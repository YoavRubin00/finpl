import { POST } from '../../app/api/account/delete+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
