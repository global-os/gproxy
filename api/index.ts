import 'dotenv/config'
import { getRequestListener } from '@hono/node-server'
import { waitUntil } from '@vercel/functions'
import type { IncomingMessage, ServerResponse } from 'node:http'
import app from '../src/app.js'
import { vercelContext } from '../src/runtime/instance/background.js'
import {
  ensureIncomingRawBody,
  type IncomingWithRawBody,
} from '../src/utils/buffer-incoming.js'

const listener = getRequestListener(app.fetch)

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  return vercelContext.run({ waitUntil }, async () => {
    try {
      await ensureIncomingRawBody(req as IncomingWithRawBody)
    } catch (err) {
      console.error('[api] failed to buffer request body:', err)
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ message: 'Failed to read request body.' }))
      return
    }

    return listener(req, res)
  })
}
