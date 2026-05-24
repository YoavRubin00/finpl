import { GET } from '../../app/api/admin/bridge-stats+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
