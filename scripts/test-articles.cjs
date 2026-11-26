const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { DatabaseSync } = require('node:sqlite')
const { pbkdf2Sync } = require('node:crypto')

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', code)(
    (name) => {
      if (dependencies[name]) return dependencies[name]
      if (name.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), name) + '.ts'
        if (fs.existsSync(resolved)) return load(resolved, dependencies)
      }
      return require(name)
    },
    mod,
    mod.exports
  )
  return mod.exports
}

// Minimal valid 1x1 PNG (real magic bytes)
const VALID_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN8sAAAAASUVORK5CYII='
const VALID_PNG_DATA_URL = `data:image/png;base64,${VALID_PNG_BASE64}`

const sqlite = new DatabaseSync(':memory:')
for (const file of [
  'migrations/0001_admin.sql',
  'migrations/0002_employees.sql',
  'migrations/0003_hub.sql',
  'migrations/0004_employee_work_permissions.sql',
  'migrations/0005_d1_usage_permission.sql',
  'migrations/0006_admin_notifications.sql',
  'migrations/0007_employee_payroll.sql',
  'migrations/0008_employee_payroll_visibility.sql',
  'migrations/0009_project_tracking.sql',
  'migrations/0011_employee_multiple_shifts.sql',
  'migrations/0013_checkout_accomplishments.sql',
  'migrations/0015_employee_hour_limits.sql',
  'migrations/0016_employee_web_push.sql',
  'migrations/0017_password_vault.sql',
  'migrations/0018_password_vault_projects_permissions.sql',
  'migrations/0019_employee_ecosystem_permissions.sql',
  'migrations/0020_employee_work_schedules.sql',
  'migrations/0021_employee_shift_change_requests.sql',
  'migrations/0022_relative_payroll_adjustments.sql',
  'migrations/0023_hourly_payroll_rates.sql',
  'migrations/0024_articles_and_permissions.sql',
]) {
  sqlite.exec(fs.readFileSync(file, 'utf8'))
}

const DB = {
  prepare(sql) {
    let args = []
    return {
      bind(...values) {
        args = values
        return this
      },
      async run() {
        return sqlite.prepare(sql).run(...args)
      },
      async first() {
        return sqlite.prepare(sql).get(...args) || null
      },
      async all() {
        return { results: sqlite.prepare(sql).all(...args) }
      },
    }
  },
  async batch(statements) {
    return Promise.all(statements.map((s) => s.run()))
  },
}

const store = load('functions/lib/store.ts')
const notifications = load('functions/lib/notifications.ts', { './store': store })
const employeeLib = load('functions/lib/employees.ts', { './store': store })
const articleContent = load('src/lib/article-content.ts')
const articlesLib = load('functions/lib/articles.ts', {
  './store': store,
  './notifications': notifications,
  '../../src/lib/article-content': articleContent,
})
const publicArticlesHandler = load('functions/api/articles/[[path]].ts', {
  '../../lib/articles': articlesLib,
}).onRequest
const passwordVault = load('functions/lib/password-vault.ts', { './store': store })
const staffChat = load('functions/lib/staff-chat.ts', { './store': store })
const visibility = load('functions/lib/project-client-visibility.ts')
const workProjects = load('functions/lib/work-projects.ts', {
  './store': store,
  './project-client-visibility': visibility,
})
const originalProjects = load('src/data/projects.ts')
const projectsLib = load('functions/lib/projects.ts', {
  './store': store,
  '../../src/data/projects': originalProjects,
})
const hubApi = load('functions/api/hub/[[path]].ts', {
  '../../lib/store': store,
  '../../../src/lib/hub-basic': load('src/lib/hub-basic.ts'),
})
const hubAdmin = load('functions/lib/hub-admin.ts', {
  './store': store,
  '../api/hub/[[path]]': hubApi,
})
const d1Usage = load('functions/lib/d1-usage.ts', { './store': store })
const serviceSubs = load('functions/lib/service-subscriptions.ts', {
  './store': store,
  './employees': employeeLib,
  '../../src/lib/system-management': load('src/lib/system-management.ts'),
})
const vapid = load('functions/lib/vapid.ts')

const adminApi = load('functions/api/admin/[[path]].ts', {
  '../../lib/articles': articlesLib,
  '../../lib/password-vault': passwordVault,
  '../../lib/staff-chat': staffChat,
  '../../lib/service-subscriptions': serviceSubs,
  '../../lib/work-projects': workProjects,
  '../../lib/store': store,
  '../../lib/employees': employeeLib,
  '../../lib/projects': projectsLib,
  '../../lib/hub-admin': hubAdmin,
  '../../lib/d1-usage': d1Usage,
  '../../lib/notifications': notifications,
}).onRequest

const employeeApi = load('functions/api/employee/[[path]].ts', {
  '../../lib/articles': articlesLib,
  '../../lib/password-vault': passwordVault,
  '../../lib/staff-chat': staffChat,
  '../../lib/work-projects': workProjects,
  '../../lib/store': store,
  '../../lib/employees': employeeLib,
  '../../lib/projects': projectsLib,
  '../../lib/hub-admin': hubAdmin,
  '../../lib/d1-usage': d1Usage,
  '../../lib/notifications': notifications,
  '../../lib/vapid': vapid,
  '../../../matjari/functions/api/[[route]]': { handleStoreRequest: async () => Response.json({}) },
}).onRequest

const middleware = load('functions/_middleware.ts').onRequest

const salt = 'cd'.repeat(24)
const adminPassword = 'admin-secret-password'
const env = {
  DB,
  ADMIN_EMAIL: 'admin@daidar.test',
  ADMIN_PASSWORD_HASH: salt + ':' + pbkdf2Sync(adminPassword, salt, 100000, 32, 'sha256').toString('hex'),
  VAPID_PUBLIC_KEY: 'B'.repeat(87),
}

function makeReq(urlPath, method = 'GET', body, cookie, origin = 'https://daidarsoluations.com') {
  return new Request(`https://daidarsoluations.com${urlPath}`, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function run() {
  // 1. Public empty state returns seeded categories and zero articles
  const initialPublic = await publicArticlesHandler({ request: makeReq('/api/articles'), env })
  assert.equal(initialPublic.status, 200)
  const initialData = await initialPublic.json()
  assert.equal(initialData.articles.length, 0)
  assert.ok(initialData.categories.length >= 5, 'preset categories seeded')
  const categoryId = initialData.categories[0].id

  // 2. Unauthenticated requests blocked on admin & employee article APIs
  assert.equal((await adminApi({ request: makeReq('/api/admin/articles', 'POST', {}), env })).status, 401)
  assert.equal((await employeeApi({ request: makeReq('/api/employee/articles', 'POST', {}), env })).status, 401)
  assert.equal((await employeeApi({ request: makeReq('/api/employee/articles', 'GET'), env })).status, 401)

  // 3. Admin login
  const adminLogin = await adminApi({
    request: makeReq('/api/admin/login', 'POST', { email: env.ADMIN_EMAIL, password: adminPassword }),
    env,
  })
  assert.equal(adminLogin.status, 200)
  const adminCookie = adminLogin.headers.get('set-cookie').split(';')[0]

  // 4. Create 2 employees — default manage_articles MUST be 0 (closed)
  const empPass = 'employee-strong-pass-123'
  for (const emp of [
    { name: 'سارة', job_title: 'كاتبة محتوى', email: 'sara@daidar.test', password: empPass, manage_projects: 1 },
    { name: 'كريم', job_title: 'مطور', email: 'karim@daidar.test', password: empPass },
  ]) {
    const res = await adminApi({ request: makeReq('/api/admin/employees', 'POST', emp, adminCookie), env })
    assert.equal(res.status, 200)
  }
  const empList = (await (await adminApi({ request: makeReq('/api/admin/employees', 'GET', undefined, adminCookie), env })).json()).employees
  const sara = empList.find((e) => e.email === 'sara@daidar.test')
  const karim = empList.find((e) => e.email === 'karim@daidar.test')
  assert.equal(sara.manage_articles, 0, 'manage_articles is closed by default')
  assert.equal(karim.manage_articles, 0, 'manage_articles is closed by default')

  // 5. Sara logs in WITHOUT permission -> 403 on articles API
  const saraLogin = await employeeApi({
    request: makeReq('/api/employee/login', 'POST', { email: sara.email, password: empPass }),
    env,
  })
  assert.equal(saraLogin.status, 200)
  const saraCookie = saraLogin.headers.get('set-cookie').split(';')[0]
  assert.equal((await employeeApi({ request: makeReq('/api/employee/articles', 'GET', undefined, saraCookie), env })).status, 403)
  assert.equal((await employeeApi({ request: makeReq('/api/employee/articles', 'POST', { title: 'محاولة' }, saraCookie), env })).status, 403)

  // 6. Grant Sara manage_articles=1 (preserving manage_projects=1)
  const grantRes = await adminApi({
    request: makeReq(
      '/api/admin/employees',
      'POST',
      { id: sara.id, name: sara.name, job_title: sara.job_title, email: sara.email, manage_articles: 1 },
      adminCookie
    ),
    env,
  })
  assert.equal(grantRes.status, 200)
  const saraAfterGrant = (await (await adminApi({ request: makeReq('/api/admin/employees', 'GET', undefined, adminCookie), env })).json()).employees.find((e) => e.id === sara.id)
  assert.equal(saraAfterGrant.manage_articles, 1)
  assert.equal(saraAfterGrant.manage_projects, 1, 'other permissions preserved untouched')

  // 7. CSRF cross-origin POST rejected
  assert.equal(
    (await employeeApi({ request: makeReq('/api/employee/articles', 'POST', {}, saraCookie, 'https://evil.example'), env })).status,
    403
  )

  // 8. Security & input validation rejections
  const validArticlePayload = {
    title: 'كيف تختار النظام الإلكتروني المناسب لشركتك',
    category_id: categoryId,
    cover_image: VALID_PNG_DATA_URL,
    cover_alt: 'صورة تعبيرية عن أنظمة إدارة الأعمال',
    content: '## لماذا تحتاج نظامًا مخصصًا\nتنظيم العمليات اليومية يوفر وقت فريقك ويقلل الأخطاء بشكل ملموس.\n\n- متابعة دقيقة\n- تقارير واضحة\n\nاطلع على [موقعنا](https://daidarsoluations.com).',
    status: 'published',
    idempotency_key: 'idem-article-1',
  }

  // XSS script tag rejected
  assert.equal(
    (await employeeApi({
      request: makeReq('/api/employee/articles', 'POST', { ...validArticlePayload, content: validArticlePayload.content + '<script>alert(1)</script>' }, saraCookie),
      env,
    })).status,
    422
  )
  // javascript: link rejected
  assert.equal(
    (await employeeApi({
      request: makeReq('/api/employee/articles', 'POST', { ...validArticlePayload, content: validArticlePayload.content + ' [click](javascript:alert(1))' }, saraCookie),
      env,
    })).status,
    422
  )
  // SVG rejected
  assert.equal(
    (await employeeApi({
      request: makeReq('/api/employee/articles', 'POST', { ...validArticlePayload, cover_image: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }, saraCookie),
      env,
    })).status,
    422
  )
  // Spoofed PNG magic bytes rejected
  assert.equal(
    (await employeeApi({
      request: makeReq('/api/employee/articles', 'POST', { ...validArticlePayload, cover_image: `data:image/png;base64,${Buffer.from('not-a-real-png-binary').toString('base64')}` }, saraCookie),
      env,
    })).status,
    422
  )
  // Missing cover rejected
  assert.equal(
    (await employeeApi({
      request: makeReq('/api/employee/articles', 'POST', { ...validArticlePayload, cover_image: '' }, saraCookie),
      env,
    })).status,
    422
  )
  // Missing/short content rejected
  assert.equal(
    (await employeeApi({
      request: makeReq('/api/employee/articles', 'POST', { ...validArticlePayload, content: 'قصير' }, saraCookie),
      env,
    })).status,
    422
  )

  // 9. Authorized employee creates published article + idempotency prevents duplicate
  const createRes = await employeeApi({
    request: makeReq('/api/employee/articles', 'POST', validArticlePayload, saraCookie),
    env,
  })
  assert.equal(createRes.status, 201)
  const createdArticle = (await createRes.json()).article
  assert.ok(createdArticle.id)
  assert.ok(createdArticle.slug)
  assert.equal(createdArticle.status, 'published')
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS c FROM admin_notifications WHERE event_type = 'article_created'").get().c, 1, 'admin notification recorded cleanly')

  const retryRes = await employeeApi({
    request: makeReq('/api/employee/articles', 'POST', validArticlePayload, saraCookie),
    env,
  })
  assert.equal(retryRes.status, 200)
  const retryData = await retryRes.json()
  assert.equal(retryData.idempotent, true)
  assert.equal(retryData.article.id, createdArticle.id)
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS c FROM articles').get().c, 1, 'no duplicate row on retry')

  // 10. Public list, reader, and cover image work AND never leak employee personal info
  const pubListRes = await publicArticlesHandler({ request: makeReq('/api/articles'), env })
  assert.equal(pubListRes.status, 200)
  const pubList = await pubListRes.json()
  assert.equal(pubList.articles.length, 1)
  const pubSummary = pubList.articles[0]
  assert.equal(pubSummary.title, validArticlePayload.title)
  assert.equal('author_employee_id' in pubSummary, false, 'no author_employee_id in public list')
  assert.equal('cover_base64' in pubSummary, false, 'no raw base64 in public list')
  assert.equal(JSON.stringify(pubList).includes(sara.email), false, 'no employee email leaked')
  assert.equal(JSON.stringify(pubList).includes(sara.id), false, 'no employee id leaked')

  const pubReadRes = await publicArticlesHandler({
    request: makeReq(`/api/articles?slug=${encodeURIComponent(createdArticle.slug)}`),
    env,
  })
  assert.equal(pubReadRes.status, 200)
  const pubRead = (await pubReadRes.json()).article
  assert.equal(pubRead.slug, createdArticle.slug)
  assert.ok(pubRead.content.includes('تنظيم العمليات'))
  assert.equal(JSON.stringify(pubRead).includes(sara.email), false)

  const pubImgRes = await publicArticlesHandler({
    request: makeReq(`/api/articles/image?id=${encodeURIComponent(createdArticle.id)}`),
    env,
  })
  assert.equal(pubImgRes.status, 200)
  assert.equal(pubImgRes.headers.get('content-type'), 'image/png')
  assert.equal(pubImgRes.headers.get('x-content-type-options'), 'nosniff')

  // Non-existent slug -> 404
  assert.equal((await publicArticlesHandler({ request: makeReq('/api/articles?slug=does-not-exist'), env })).status, 404)

  // 11. Draft article stays completely hidden from public list, reader, and image endpoint
  const draftRes = await employeeApi({
    request: makeReq(
      '/api/employee/articles',
      'POST',
      { ...validArticlePayload, title: 'مسودة مقال غير منشور', status: 'draft', idempotency_key: 'idem-draft-1' },
      saraCookie
    ),
    env,
  })
  assert.equal(draftRes.status, 201)
  const draftArticle = (await draftRes.json()).article
  assert.equal((await (await publicArticlesHandler({ request: makeReq('/api/articles'), env })).json()).articles.length, 1)
  assert.equal(
    (await publicArticlesHandler({ request: makeReq(`/api/articles?slug=${encodeURIComponent(draftArticle.slug)}`), env })).status,
    404
  )
  assert.equal(
    (await publicArticlesHandler({ request: makeReq(`/api/articles/image?id=${encodeURIComponent(draftArticle.id)}`), env })).status,
    404
  )

  // 12. Second employee with manage_articles CANNOT edit Sara's article, CANNOT delete, CANNOT manage categories
  await adminApi({
    request: makeReq(
      '/api/admin/employees',
      'POST',
      { id: karim.id, name: karim.name, job_title: karim.job_title, email: karim.email, manage_articles: 1 },
      adminCookie
    ),
    env,
  })
  const karimLogin = await employeeApi({
    request: makeReq('/api/employee/login', 'POST', { email: karim.email, password: empPass }),
    env,
  })
  const karimCookie = karimLogin.headers.get('set-cookie').split(';')[0]
  assert.equal((await (await employeeApi({ request: makeReq('/api/employee/articles', 'GET', undefined, karimCookie), env })).json()).articles.length, 0)
  assert.equal(
    (await employeeApi({
      request: makeReq('/api/employee/articles', 'POST', { ...validArticlePayload, id: createdArticle.id, title: 'محاولة تعديل مقال زميل' }, karimCookie),
      env,
    })).status,
    403
  )
  assert.equal(
    (await employeeApi({ request: makeReq('/api/employee/articles', 'DELETE', { id: createdArticle.id }, karimCookie), env })).status,
    403
  )
  assert.equal(
    (await employeeApi({ request: makeReq('/api/employee/article-categories', 'POST', { name_ar: 'تصنيف' }, karimCookie), env })).status,
    403
  )

  // 13. Revoking Sara's permission IMMEDIATELY blocks her next request even with active session cookie
  await adminApi({
    request: makeReq(
      '/api/admin/employees',
      'POST',
      { id: sara.id, name: sara.name, job_title: sara.job_title, email: sara.email, manage_articles: 0 },
      adminCookie
    ),
    env,
  })
  assert.equal((await employeeApi({ request: makeReq('/api/employee/articles', 'GET', undefined, saraCookie), env })).status, 403)
  assert.equal(
    (await employeeApi({
      request: makeReq('/api/employee/articles', 'POST', { ...validArticlePayload, idempotency_key: 'after-revoke' }, saraCookie),
      env,
    })).status,
    403
  )

  // 14. Admin manages categories and articles (add/delete category, block deleting in-use category, delete article)
  const addCatRes = await adminApi({
    request: makeReq('/api/admin/article-categories', 'POST', { name_ar: 'أمن المعلومات', name_en: 'Security' }, adminCookie),
    env,
  })
  assert.equal(addCatRes.status, 201)
  const newCat = (await addCatRes.json()).category

  // Cannot delete category currently used by Sara's article
  assert.equal(
    (await adminApi({ request: makeReq('/api/admin/article-categories', 'DELETE', { id: categoryId }, adminCookie), env })).status,
    409
  )
  // Can delete unused category
  assert.equal(
    (await adminApi({ request: makeReq('/api/admin/article-categories', 'DELETE', { id: newCat.id }, adminCookie), env })).status,
    200
  )

  // Admin sees both published & draft articles and can delete draft
  const adminArticles = (await (await adminApi({ request: makeReq('/api/admin/articles', 'GET', undefined, adminCookie), env })).json()).articles
  assert.equal(adminArticles.length, 2)
  assert.equal(
    (await adminApi({ request: makeReq('/api/admin/articles', 'DELETE', { id: draftArticle.id }, adminCookie), env })).status,
    200
  )

  // 15. Middleware rewrites /ar/articles/<slug> to /ar/articles/read?slug=<slug>
  let rewrittenUrl = ''
  await middleware({
    env,
    request: new Request(`https://daidarsoluations.com/ar/articles/${createdArticle.slug}`),
    next: async (req) => {
      rewrittenUrl = req.url
      return new Response('ok')
    },
  })
  assert.equal(rewrittenUrl, `https://daidarsoluations.com/ar/articles/read?slug=${createdArticle.slug}`)

  console.log('test-articles.cjs passed all assertions!')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
