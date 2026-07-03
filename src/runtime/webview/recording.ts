import { isNull, desc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as schema from '../../db/schema.js'

// In-flight promise — concurrent requests on a cold start share one DB query
// instead of each racing to acquire a pool connection. Cleared as soon as the
// query settles (not cached indefinitely): this runs on Vercel, where warm
// instances handle many requests over their lifetime, and /start/stop happen
// on whichever instance handles that HTTP request — a stale cached `null`
// from before /start was called would otherwise never be revisited by an
// instance for the rest of its warm lifetime, silently dropping recorded
// traffic despite recording being active.
let sessionPromise: Promise<number | null> | null = null

function querySession(): Promise<number | null> {
  if (sessionPromise) return sessionPromise
  sessionPromise = db
    .select({ id: schema.proxyRecordingSession.id })
    .from(schema.proxyRecordingSession)
    .where(isNull(schema.proxyRecordingSession.stopped_at))
    .orderBy(desc(schema.proxyRecordingSession.started_at))
    .limit(1)
    .then(([row]) => row?.id ?? null)
    .finally(() => { sessionPromise = null })
  return sessionPromise
}

export function getActiveSessionId(): Promise<number | null> {
  return querySession()
}

export async function startRecording(): Promise<number> {
  await db.delete(schema.proxyRecordingSession)
  const [row] = await db
    .insert(schema.proxyRecordingSession)
    .values({ started_at: new Date() })
    .returning({ id: schema.proxyRecordingSession.id })
  return row.id
}

export async function stopRecording(): Promise<void> {
  await db
    .update(schema.proxyRecordingSession)
    .set({ stopped_at: new Date() })
    .where(isNull(schema.proxyRecordingSession.stopped_at))
}

export async function clearRecording(): Promise<void> {
  await db.delete(schema.proxyRecordingSession)
}

export interface TrafficEntry {
  sessionId: number
  slug: string
  method: string
  upstreamUrl: string
  requestHeaders: { name: string; value: string }[]
  requestBody: string | null
  responseStatus: number
  responseHeaders: { name: string; value: string }[]
  responseBody: string | null
  responseBodyEncoding: string | null
  durationMs: number
}

// Batch pending inserts so concurrent requests share one DB round-trip
// instead of each acquiring their own pool connection.
let pendingEntries: (typeof schema.proxyTraffic.$inferInsert)[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush(): void {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    const batch = pendingEntries
    pendingEntries = []
    if (batch.length === 0) return
    db.insert(schema.proxyTraffic).values(batch).catch(err => {
      console.error('[recording] flush failed:', err instanceof Error ? err.message : String(err))
    })
  }, 500)
}

export function recordTraffic(entry: TrafficEntry): void {
  pendingEntries.push({
    session_id: entry.sessionId,
    slug: entry.slug,
    method: entry.method,
    upstream_url: entry.upstreamUrl,
    request_headers: entry.requestHeaders,
    request_body: entry.requestBody,
    response_status: entry.responseStatus,
    response_headers: entry.responseHeaders,
    response_body: entry.responseBody,
    response_body_encoding: entry.responseBodyEncoding,
    duration_ms: entry.durationMs,
  })
  scheduleFlush()
}

const BODY_SIZE_LIMIT = 512 * 1024 // 512 KB

export async function captureResponseBody(
  response: Response,
): Promise<{ body: ArrayBuffer; text: string | null; encoding: string | null }> {
  const contentType = response.headers.get('content-type') ?? ''
  const buf = await response.arrayBuffer()

  const isBinaryMedia = /^(image|font|audio|video)\//.test(contentType)
  if (isBinaryMedia || buf.byteLength > BODY_SIZE_LIMIT) {
    return { body: buf, text: null, encoding: null }
  }

  const isTextLike = /^(text\/|application\/json|application\/x-www-form-urlencoded|application\/javascript|application\/x-protobuf)/.test(contentType)
  if (!isTextLike) {
    return { body: buf, text: Buffer.from(buf).toString('base64'), encoding: 'base64' }
  }

  return { body: buf, text: new TextDecoder().decode(buf), encoding: null }
}

export async function exportHar(): Promise<object> {
  const entries = await db
    .select()
    .from(schema.proxyTraffic)
    .orderBy(schema.proxyTraffic.id)

  return {
    log: {
      version: '1.2',
      creator: { name: 'GlobalOS Proxy', version: '1.0' },
      entries: entries.map(e => ({
        startedDateTime: e.recorded_at.toISOString(),
        time: e.duration_ms ?? -1,
        request: {
          method: e.method,
          url: e.upstream_url,
          httpVersion: 'HTTP/1.1',
          headers: e.request_headers as { name: string; value: string }[],
          cookies: [],
          queryString: [],
          headersSize: -1,
          bodySize: e.request_body ? e.request_body.length : -1,
          ...(e.request_body ? {
            postData: { mimeType: 'application/octet-stream', text: e.request_body },
          } : {}),
        },
        response: {
          status: e.response_status ?? 0,
          statusText: '',
          httpVersion: 'HTTP/1.1',
          headers: e.response_headers as { name: string; value: string }[],
          cookies: [],
          content: {
            size: -1,
            mimeType: (e.response_headers as { name: string; value: string }[])
              .find(h => h.name.toLowerCase() === 'content-type')?.value ?? '',
            ...(e.response_body != null
              ? e.response_body_encoding === 'base64'
                ? { text: e.response_body, encoding: 'base64' }
                : { text: e.response_body }
              : {}),
          },
          redirectURL: '',
          headersSize: -1,
          bodySize: -1,
        },
        cache: {},
        timings: { send: 0, wait: e.duration_ms ?? -1, receive: 0 },
        _slug: e.slug,
      })),
    },
  }
}
