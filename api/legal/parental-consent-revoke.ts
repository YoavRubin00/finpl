import { GET } from '../../app/api/legal/parental-consent-revoke+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
