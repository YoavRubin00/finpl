import { GET } from '../../app/api/legal/parental-consent-status+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
