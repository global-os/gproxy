import { Hono } from 'hono'
import type { Env } from '../types.js'

const router = new Hono<Env>()

router.post('/', (c) => {
  const user = c.get('user')
  if (!user) return c.json({ message: 'Unauthorized' }, 401)
  return c.json({ visitId: crypto.randomUUID() })
})

export default router
