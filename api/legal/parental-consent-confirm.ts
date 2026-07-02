import { GET } from '../../app/api/legal/parental-consent-confirm+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
