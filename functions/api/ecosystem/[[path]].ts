import { ecosystem } from '../../../shared/ecosystem';
import { hubAdapter } from '../../lib/ecosystem';
import type { Env } from '../../lib/store';
import {ecosystemAdministration} from '../../lib/ecosystem-admin';
export const onRequest=async({request,env}:{request:Request;env:Env})=>{
  if(new URL(request.url).pathname.startsWith('/api/ecosystem/admin/')){
    const result=await ecosystemAdministration(request,env);if(result)return result;
  }
  return ecosystem(request,env,hubAdapter(env));
};
