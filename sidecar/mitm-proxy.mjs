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

export async function startMitmProxy(upstreamProxyUrl) {
  const proxy = new Proxy()

  if (upstreamProxyUrl) {
    proxy.httpAgent = new HttpProxyAgent(upstreamProxyUrl)
    proxy.httpsAgent = new HttpsProxyAgent(upstreamProxyUrl)
  }

  proxy.onError((ctx, err, kind) => {
    console.error(`[mitm] ${kind ?? 'error'}:`, err instanceof Error ? err.message : String(err))
  })

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
  return { proxy, port }
}
