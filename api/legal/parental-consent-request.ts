import { POST } from '../../app/api/legal/parental-consent-request+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
