import { Hono } from 'hono'
import { randomBytes } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import * as middleware from '../middleware.js'
import * as schema from '../db/schema.js'
import { Env } from '../types.js'
import { isAdminEmail } from '../constants/admin.js'

const router = new Hono<Env>()

// decodo residential-proxy URLs pin the exit IP to the username, which is
// either a bare session (newer) or `user-<session>-asn-<asn>` (older):
//   http://<session>:<password>@isp.decodo.com:10004
//   http://user-<session>-asn-<asn>:<password>@isp.decodo.com:10001
// A fresh session gets a fresh IP.
const DECODO_USERNAME_RE = /^user-([a-zA-Z0-9]+)-asn-(\d+)$/
const SESSION_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function newSession(): string {
  const bytes = randomBytes(10)
  let out = ''
  for (let i = 0; i < 10; i++)
    out += SESSION_ALPHABET[bytes[i]! % SESSION_ALPHABET.length]
  return out
}

/** Regenerate the session (IP) in a decodo proxy URL, keeping everything else. */
function rotateProxySession(proxyUrl: string): string | null {
  let url: URL
  try {
    url = new URL(proxyUrl)
  } catch {
    return null
  }
  if (!url.hostname.includes('decodo')) return null
  if (!url.username) return null
  const m = url.username.match(DECODO_USERNAME_RE)
  url.username = m ? `user-${newSession()}-asn-${m[2]}` : newSession()
  return url.toString().replace(/\/$/, '')
}

router.use(
  '*',
  middleware.provideDb,
  middleware.parseCookies,
  middleware.betterAuthMiddleware
)

router.get('/proxy-config', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)
  if (!isAdminEmail(user.email)) return c.json({ message: 'Forbidden' }, 403)

  const db = c.get('db')
  const [row] = await db
    .select()
    .from(schema.proxyConfig)
    .where(eq(schema.proxyConfig.id, 1))

  // Sidecar has its own tiny status page, gated by the same shared secret —
  // no session cookie support there, so the secret rides along as a query
  // param (only ever sent to an already-admin-gated page).
  const sidecarUrl = process.env.SIDECAR_URL
  const sidecarSecret = process.env.SIDECAR_SECRET
  const sidecarAdminUrl = sidecarUrl
    ? `${sidecarUrl.replace(/\/$/, '')}/admin${sidecarSecret ? `?secret=${encodeURIComponent(sidecarSecret)}` : ''}`
    : null

  return c.json({
    proxyUrl: row?.proxy_url ?? null,
    updatedAt: row?.updated_at ?? null,
    sidecarAdminUrl,
  })
})

router.put('/proxy-config', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)
  if (!isAdminEmail(user.email)) return c.json({ message: 'Forbidden' }, 403)

  const body = (await c.req.json().catch(() => null)) as {
    proxyUrl?: string | null
  } | null
  if (!body || (body.proxyUrl != null && typeof body.proxyUrl !== 'string')) {
    return c.json({ message: 'Expected { proxyUrl: string | null }' }, 400)
  }

  const db = c.get('db')
  const [row] = await db
    .update(schema.proxyConfig)
    .set({ proxy_url: body.proxyUrl || null, updated_at: new Date() })
    .where(eq(schema.proxyConfig.id, 1))
    .returning()

  return c.json({
    proxyUrl: row?.proxy_url ?? null,
    updatedAt: row?.updated_at ?? null,
  })
})

router.post('/proxy-config/rotate', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)
  if (!isAdminEmail(user.email)) return c.json({ message: 'Forbidden' }, 403)

  const db = c.get('db')
  const [row] = await db
    .select()
    .from(schema.proxyConfig)
    .where(eq(schema.proxyConfig.id, 1))

  const current = row?.proxy_url ?? null
  if (!current) return c.json({ message: 'No proxy URL configured' }, 400)

  const rotated = rotateProxySession(current)
  if (!rotated) {
    return c.json(
      {
        message: 'Proxy URL is not a decodo proxy URL',
      },
      400
    )
  }

  const [updated] = await db
    .update(schema.proxyConfig)
    .set({ proxy_url: rotated, updated_at: new Date() })
    .where(eq(schema.proxyConfig.id, 1))
    .returning()

  return c.json({
    proxyUrl: updated?.proxy_url ?? null,
    updatedAt: updated?.updated_at ?? null,
  })
})

router.get('/users', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)
  if (!isAdminEmail(user.email)) return c.json({ message: 'Forbidden' }, 403)

  const db = c.get('db')
  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      emailVerified: schema.user.emailVerified,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(desc(schema.user.createdAt))

  return c.json({ count: users.length, users })
})

export default router
