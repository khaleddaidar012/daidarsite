import { ecosystem } from '../../../../../shared/ecosystem';
import { storeAdapter } from '../../../../lib/ecosystem';

export const onRequest = ({ request, env }: { request: Request; env: any }) => {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/^\/api\/store(?=\/|$)/, '/api');
  return ecosystem(new Request(url, request), env, storeAdapter(env));
};
