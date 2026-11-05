import { ecosystem } from '../../../shared/ecosystem';
import { handleStoreRequest } from '../../../matjari/functions/api/[[route]]';
import { storeAdapter } from '../../../matjari/lib/ecosystem';

type StoreEnv = Record<string, any> & { ECOSYSTEM_STORE_DB?: any };

export async function onRequest({ request, env }: { request: Request; env: StoreEnv }) {
  const url = new URL(request.url);
  const localPath = url.pathname.replace(/^\/api\/store\/?/, '');
  const storeEnv = {
    ...env,
    DB: env.ECOSYSTEM_STORE_DB,
    ECOSYSTEM_CLIENT: 'store',
    ECOSYSTEM_STORE_ORIGIN: url.origin,
    READ_ONLY_PREVIEW: 'false',
  };

  if (!storeEnv.DB) {
    return Response.json({ error: 'قاعدة بيانات المتجر غير مربوطة' }, { status: 503 });
  }

  if (localPath === 'ecosystem' || localPath.startsWith('ecosystem/')) {
    url.pathname = `/api/${localPath}`;
    return ecosystem(new Request(url, request), storeEnv, storeAdapter(storeEnv));
  }

  url.pathname = `/api/${localPath}`;
  return handleStoreRequest(new Request(url, request), storeEnv);
}
