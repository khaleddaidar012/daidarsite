import { ecosystem } from '../../../shared/ecosystem';
import { hubAdapter } from '../../lib/ecosystem';
import type { Env } from '../../lib/store';
export const onRequest=({request,env}:{request:Request;env:Env})=>ecosystem(request,env,hubAdapter(env));
