import { ecosystem } from '../../../../shared/ecosystem';
import { storeAdapter, type StoreEcoEnv } from '../../../lib/ecosystem';
export const onRequest=({request,env}:{request:Request;env:StoreEcoEnv})=>ecosystem(request,env,storeAdapter(env));
