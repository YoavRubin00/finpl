import { GET } from '../../app/api/referral/me+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
