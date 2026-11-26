import { publicArticles } from '../../lib/articles'
import type { Env } from '../../lib/store'

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  const path = new URL(request.url).pathname.replace(/^\/api\/articles\/?/, '').replace(/\/$/, '')
  return publicArticles(request, env, path)
}
