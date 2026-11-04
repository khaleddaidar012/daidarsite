import { ecoBind, ecoLocalId, ecoPublish, ecoUser, type EcoAdapter, type Identity } from '../../shared/ecosystem';
import type { Env } from './store';
export const hubAdapter=(env:Env):EcoAdapter=>({
  system:'hub',
  async ensureLocal(user:Identity){
    const linked=await ecoLocalId(env,'hub',user.id);if(linked)return linked;
    if(await env.DB!.prepare('SELECT id FROM hub_users WHERE email=? COLLATE NOCASE').bind(user.email).first())throw Object.assign(new Error('هذا البريد له حساب Hub سابق. سجل الدخول إليه ثم اربطه بالحساب الموحد.'),{status:409});
    const id=crypto.randomUUID();await env.DB!.prepare('INSERT INTO hub_users(id,email,name,created_at) VALUES(?,?,?,?)').bind(id,user.email,user.name,Date.now()).run();
    await ecoBind(env,'hub',{id,email:user.email,name:user.name},user.id);return id;
  },
  async sync(user,localId){
    const subs=await env.DB!.prepare('SELECT id,product_id,status,starts_at,expires_at,snapshot FROM hub_subscriptions WHERE user_id=?').bind(localId).all<any>();
    for(const s of subs.results){const snapshot=JSON.parse(s.snapshot);await ecoPublish(env,s.product_id==='daidar-flow'?'flow':'hub',user.id,s.id,s.status,snapshot.product||s.product_id,s.starts_at,s.expires_at)}
  },
  async googleLocal(subject){const r=await env.DB!.prepare('SELECT id,email,name FROM hub_users WHERE google_subject=? AND active=1').bind(subject).first<any>();return r||null}
  ,async verifyGoogle(token,clientId){const {createRemoteJWKSet,jwtVerify}=await import('jose');const {payload}=await jwtVerify(token,createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs')),{issuer:['https://accounts.google.com','accounts.google.com'],audience:clientId,algorithms:['RS256']});return payload}
});
export async function hubEcoUser(request:Request,env:Env){
  const user=await ecoUser(request,env);if(!user)return null;const id=await ecoLocalId(env,'hub',user.id);if(!id)return null;
  return env.DB!.prepare('SELECT id,name,email FROM hub_users WHERE id=? AND active=1').bind(id).first<{id:string;name:string;email:string}>();
}
