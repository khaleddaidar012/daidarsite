export interface EcosystemAccountView {
  connected:boolean;offline:boolean;name?:string;expiresAt?:number;
  subscriptions:{plan:string;status:string;expires_at:number|null}[];
  message?:string;
}
export interface EcosystemStart {code:string;expiresAt:number}
