// Local TLS-terminating proxy sitting between the sidecar's Chrome and the
// real upstream (residential proxy -> target site). Two jobs:
//
// 1. Corrects Sec-Fetch-* headers. Chrome computes Sec-Fetch-Site/Dest from
//    the *real* request context (a background fetch() from a never-navigated
//    blank page) and recomputes them after CDP's Fetch.continueRequest, no
//    matter what we ask for there — confirmed empirically against a local
//    echo server: asking for Sec-Fetch-Site: none / Sec-Fetch-Dest: document
//    got silently overwritten back to cross-site/empty, while Sec-Fetch-Mode
//    was honored, producing an internally-inconsistent (and more suspicious)
//    combination no real browser would ever produce. This proxy corrects
//    what actually goes out on the wire, after Chrome's own header injection.
//
// 2. Forwards to the real upstream proxy itself (with credentials), so
//    Chrome only ever talks to this local, unauthenticated proxy — avoiding
//    the separate conflict where Chrome's own internal proxy-auth handling
//    fights with our Fetch domain interception (see server.mjs comments).
import { Proxy } from 'http-mitm-proxy'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { HttpProxyAgent } from 'http-proxy-agent'

/** Very rough eTLD+1 comparison — good enough for x.com/api.x.com vs abs.twimg.com. */
function registrableDomain(hostname) {
  const parts = hostname.split('.')
  return parts.slice(-2).join('.')
}

function isSameSite(hostA, hostB) {
  return registrableDomain(hostA) === registrableDomain(hostB)
}

const MAX_RECORDED_ENTRIES = 500
const MAX_BODY_BYTES = 512 * 1024

export async function startMitmProxy(upstreamProxyUrl) {
  const proxy = new Proxy()

  if (upstreamProxyUrl) {
    proxy.httpAgent = new HttpProxyAgent(upstreamProxyUrl)
    proxy.httpsAgent = new HttpsProxyAgent(upstreamProxyUrl)
  }

  proxy.onError((ctx, err, kind) => {
    console.error(`[mitm] ${kind ?? 'error'}:`, err instanceof Error ? err.message : String(err))
  })

  // Records the request/response exactly as they cross this proxy — i.e.
  // after Chrome's own header injection and our Sec-Fetch-* corrections,
  // the actual bytes that leave for the real upstream. This is the one place
  // in the whole pipeline that sees ground truth: the app-level HAR recorder
  // (src/runtime/webview/recording.ts) only ever captures the headers we
  // *intended* to send (forwardHeaders), not what Chrome/CDP actually put on
  // the wire — confirmed to differ (Sec-Fetch-* is a clear example).
  let recording = false
  let entries = []

  function recordEntry(ctx) {
    const req = ctx.proxyToServerRequestOptions
    const res = ctx.serverToProxyResponse
    const scheme = ctx.isSSL ? 'https' : 'http'
    entries.push({
      startedDateTime: new Date().toISOString(),
      request: {
        method: req.method,
        url: `${scheme}://${req.host}${req.path}`,
        headers: Object.entries(req.headers || {}).map(([name, value]) => ({ name, value: String(value) })),
        bodyBase64: Buffer.concat(ctx._reqChunks || []).subarray(0, MAX_BODY_BYTES).toString('base64'),
      },
      response: res ? {
        status: res.statusCode,
        headers: Object.entries(res.headers || {}).map(([name, value]) => ({
          name, value: Array.isArray(value) ? value.join(', ') : String(value),
        })),
        bodyBase64: Buffer.concat(ctx._resChunks || []).subarray(0, MAX_BODY_BYTES).toString('base64'),
      } : null,
    })
    if (entries.length > MAX_RECORDED_ENTRIES) entries = entries.slice(-MAX_RECORDED_ENTRIES)
  }

  proxy.onRequest((ctx, callback) => {
    const headers = ctx.proxyToServerRequestOptions.headers
    const targetHost = ctx.proxyToServerRequestOptions.host

    // Our CDP-level Origin override is already correctly set to the bound
    // domain (verified working) — use it as the reference for the site
    // comparison instead of needing a side-channel from the sidecar.
    const originHeader = headers['origin']
    let originHost = null
    try { originHost = originHeader ? new URL(originHeader).hostname : null } catch { /* no origin header */ }

    if (headers['sec-fetch-mode'] === 'navigate') {
      // Main-document request (we asked for navigate mode via CDP and Chrome
      // honored that part) — Dest/Site get silently recomputed wrong by
      // Chrome regardless, fix them here to match a genuine top-level load.
      headers['sec-fetch-dest'] = 'document'
      headers['sec-fetch-site'] = 'none'
      headers['sec-fetch-user'] = '?1'
    } else if (originHost && headers['sec-fetch-site']) {
      headers['sec-fetch-site'] = isSameSite(originHost, targetHost) ? 'same-site' : 'cross-site'
    }

    if (recording) {
      ctx._reqChunks = []
      ctx._resChunks = []
      ctx.onRequestData((ctx2, chunk, cb) => { ctx2._reqChunks.push(chunk); return cb(null, chunk) })
      ctx.onResponseData((ctx2, chunk, cb) => { ctx2._resChunks.push(chunk); return cb(null, chunk) })
      ctx.onResponseEnd((ctx2, cb) => { recordEntry(ctx2); return cb() })
    }

    callback()
  })

  // Explicit 127.0.0.1, not 'localhost' — Node's default dual-stack resolution
  // can bind IPv6-only (::1), and Chrome's proxy config below connects via
  // the literal IPv4 loopback address, which would then get connection
  // refused (confirmed empirically — this was the actual cause of every
  // request failing with a generic Chrome "network error: Failed").
  const port = await new Promise((resolve, reject) => {
    proxy.listen({ port: 0, host: '127.0.0.1' }, (err) => {
      if (err) return reject(err)
      resolve(proxy.httpServer.address().port)
    })
  })

  console.log(`[mitm] listening :${port}  upstream=${upstreamProxyUrl ? 'configured' : 'none'}`)

  return {
    proxy,
    port,
    startRecording() { entries = []; recording = true },
    stopRecording() { recording = false },
    exportHar() {
      return {
        log: {
          version: '1.2',
          creator: { name: 'mitm-proxy sidecar recorder', version: '1.0' },
          entries: entries.map((e) => ({
            startedDateTime: e.startedDateTime,
            time: -1,
            request: {
              method: e.request.method,
              url: e.request.url,
              httpVersion: 'HTTP/1.1',
              headers: e.request.headers,
              cookies: [],
              queryString: [],
              headersSize: -1,
              bodySize: -1,
              ...(e.request.bodyBase64 ? { postData: { mimeType: 'application/octet-stream', text: e.request.bodyBase64, encoding: 'base64' } } : {}),
            },
            response: e.response ? {
              status: e.response.status,
              statusText: '',
              httpVersion: 'HTTP/1.1',
              headers: e.response.headers,
              cookies: [],
              content: {
                size: -1,
                mimeType: e.response.headers.find((h) => h.name.toLowerCase() === 'content-type')?.value ?? '',
                text: e.response.bodyBase64,
                encoding: 'base64',
              },
              redirectURL: '',
              headersSize: -1,
              bodySize: -1,
            } : { status: 0, statusText: '', httpVersion: 'HTTP/1.1', headers: [], cookies: [], content: { size: -1, mimeType: '' }, redirectURL: '', headersSize: -1, bodySize: -1 },
            cache: {},
            timings: { send: 0, wait: -1, receive: 0 },
          })),
        },
      }
    },
  }
}
