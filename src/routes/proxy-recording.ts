import { Hono } from 'hono'
import type { Env } from '../types.js'
import { startRecording, stopRecording, clearRecording, exportHar } from '../runtime/webview/recording.js'

const router = new Hono<Env>()

router.post('/start', async (c) => {
  const sessionId = await startRecording()
  return c.json({ ok: true, sessionId })
})

router.post('/stop', async (c) => {
  await stopRecording()
  return c.json({ ok: true })
})

router.post('/clear', async (c) => {
  await clearRecording()
  return c.json({ ok: true })
})

router.get('/har', async (c) => {
  const har = await exportHar()
  return new Response(JSON.stringify(har, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="proxy-traffic.har"',
    },
  })
})

export default router
