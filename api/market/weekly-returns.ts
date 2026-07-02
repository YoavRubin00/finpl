import { GET } from '../../app/api/market/weekly-returns+api';
import { toVercelHandler } from '../_shared/webHandlerAdapter';

export default toVercelHandler({ GET });
