import { POST } from '../../app/api/legal/parental-consent-notify-purchase+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
