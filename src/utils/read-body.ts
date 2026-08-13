import type { Context } from 'hono'
import type { HttpBindings } from '@hono/node-server'
import type { IncomingWithRawBody } from './buffer-incoming.js'

export async function readRequestBody(
  c: Context,
  timeoutMs = 5_000
): Promise<Buffer> {
  const incoming = (c.env as HttpBindings | undefined)?.incoming as
    | IncomingWithRawBody
    | undefined
  if (incoming?.rawBody instanceof Buffer) {
    return incoming.rawBody
  }

  if (incoming && c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    const { ensureIncomingRawBody } = await import('./buffer-incoming.js')
    try {
      await ensureIncomingRawBody(incoming, timeoutMs)
      if (incoming.rawBody instanceof Buffer) return incoming.rawBody
    } catch (err) {
      console.warn(
        '[read-body] incoming read failed, falling back to Request:',
        err
      )
    }
  }

  const body = await Promise.race([
    c.req.arrayBuffer(),
    new Promise<ArrayBuffer>((_, reject) =>
      setTimeout(
        () =>
          reject(new Error(`Request body read timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ])
  return Buffer.from(body)
}

export async function buildBufferedRequest(c: Context): Promise<Request> {
  const headers = new Headers(c.req.raw.headers)
  const method = c.req.method

  if (method === 'GET' || method === 'HEAD') {
    return new Request(c.req.url, { method, headers })
  }

  const body = await readRequestBody(c)
  if (body.length === 0) {
    return new Request(c.req.url, { method, headers })
  }

  return new Request(c.req.url, {
    method,
    headers,
    body: new Uint8Array(body),
  })
}
