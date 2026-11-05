import { ecosystem } from '../../../shared/ecosystem';
import { hubAdapter } from '../../lib/ecosystem';
import type { Env } from '../../lib/store';
import {ecosystemAdministration} from '../../lib/ecosystem-admin';
export const onRequest=async({request,env}:{request:Request;env:Env})=>{
  const hubEnv={...env,ECOSYSTEM_CLIENT:'hub',ECOSYSTEM_STORE_ORIGIN:new URL(request.url).origin};
  if(new URL(request.url).pathname.startsWith('/api/ecosystem/admin/')){
    const result=await ecosystemAdministration(request,hubEnv);if(result)return result;
  }
  return ecosystem(request,hubEnv,hubAdapter(hubEnv));
};
