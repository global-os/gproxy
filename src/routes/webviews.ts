import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { Env } from '../types.js'
import * as schema from '../db/schema.js'
import { db as globalDb } from '../db/index.js'
import { generateInstanceSlug } from '../runtime/instance/slug.js'
import { instancePublicUrl } from '../runtime/urls.js'
import { auth } from '../auth.js'
import { evictWebviewCache } from '../runtime/webview/resolve.js'

const router = new Hono<Env>()

router.post('/', async (c) => {
  let user = c.get('user')
  if (!user) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null)
    user = session?.user ?? null
  }
  if (!user) {
    const hasCookie = !!c.req.raw.headers.get('cookie')
    return c.json({ message: 'Unauthorized', debug: { hasCookie } }, 401)
  }

  const body = await c.req.json() as { processId?: number; domain?: string }
  const { processId, domain } = body

  if (!processId || !domain) {
    return c.json({ message: 'processId and domain are required' }, 400)
  }

  try {
    const [proc] = await globalDb
      .select({ workspace_user_id: schema.workspace.user_id })
      .from(schema.process)
      .innerJoin(schema.workspace, eq(schema.workspace.id, schema.process.workspace_id))
      .where(eq(schema.process.id, processId))
      .limit(1)

    if (!proc || proc.workspace_user_id !== user.id) {
      return c.json({ message: 'Process not found' }, 404)
    }

    const slug = generateInstanceSlug()
    const [row] = await globalDb
      .insert(schema.webview)
      .values({ slug, process_id: processId, domain })
      .returning({ id: schema.webview.id, slug: schema.webview.slug })

    if (!row) return c.json({ message: 'Failed to create webview' }, 500)

    const proxyOrigin = instancePublicUrl(row.slug).replace(/\/$/, '')

    return c.json({
      webviewId: String(row.id),
      slug: row.slug,
      domain,
      proxyOrigin,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[webview] POST / error:', message)
    return c.json({ message }, 500)
  }
})

router.delete('/:webviewId', async (c) => {
  let user = c.get('user')
  if (!user) {
    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null)
    user = session?.user ?? null
  }
  if (!user) return c.json({ message: 'Unauthorized' }, 401)

  const webviewId = Number(c.req.param('webviewId'))
  if (!Number.isFinite(webviewId)) return c.json({ message: 'Invalid webviewId' }, 400)

  try {
    const [row] = await globalDb
      .select({ workspace_user_id: schema.workspace.user_id, slug: schema.webview.slug })
      .from(schema.webview)
      .innerJoin(schema.process, eq(schema.process.id, schema.webview.process_id))
      .innerJoin(schema.workspace, eq(schema.workspace.id, schema.process.workspace_id))
      .where(eq(schema.webview.id, webviewId))
      .limit(1)

    if (!row || row.workspace_user_id !== user.id) {
      return c.json({ message: 'Not found' }, 404)
    }

    await globalDb.delete(schema.webview).where(eq(schema.webview.id, webviewId))
    evictWebviewCache(row.slug)

    return c.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return c.json({ message }, 500)
  }
})

export default router
