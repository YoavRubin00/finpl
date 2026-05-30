import { POST } from '../../app/api/ai/payslip-analyze+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ POST });
