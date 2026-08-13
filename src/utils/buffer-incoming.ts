import type { IncomingMessage } from 'node:http'

export type IncomingWithRawBody = IncomingMessage & { rawBody?: Buffer }

export async function ensureIncomingRawBody(
  incoming: IncomingWithRawBody,
  timeoutMs = 10_000
): Promise<void> {
  if (incoming.method === 'GET' || incoming.method === 'HEAD') return
  if (incoming.rawBody instanceof Buffer) return

  if (incoming.readableEnded) {
    incoming.rawBody = Buffer.alloc(0)
    return
  }

  incoming.rawBody = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Incoming body read timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    const onData = (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    const onEnd = () => {
      cleanup()
      resolve(Buffer.concat(chunks))
    }
    const onError = (err: Error) => {
      cleanup()
      reject(err)
    }
    const cleanup = () => {
      clearTimeout(timeout)
      incoming.off('data', onData)
      incoming.off('end', onEnd)
      incoming.off('error', onError)
    }

    incoming.on('data', onData)
    incoming.on('end', onEnd)
    incoming.on('error', onError)
    incoming.resume()
  })
}
