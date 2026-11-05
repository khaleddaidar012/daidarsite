import { handleStoreRequest } from '../[[route]]';

export const onRequest = ({ request, env }: { request: Request; env: any }) => {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/^\/api\/store(?=\/|$)/, '/api');
  return handleStoreRequest(new Request(url, request), env);
};
