// TLS-impersonation sidecar, v2: real Chrome (via Patchright) instead of
// tls-client. Real Google Chrome is required — Playwright's bundled Chromium
// gets detected regardless of headers/UA. Headless is fine as long as the UA
// string has "Headless" stripped (see UA constant below) — that alone was
// enough to pass X's login flow in local testing; no Xvfb/virtual display
// needed. See SETUP_SIDECAR.md for how this was determined.
//
// Origin/Referer/Cookie are "forbidden headers" browsers refuse to let JS
// set via fetch() — but callers (proxy.ts) need exact control over those to
// spoof the bound domain. We intercept at the CDP Fetch domain instead of
// page JS: CDP sits below the browser's fetch() spec restrictions, so
// Fetch.continueRequest can override any header, including the forbidden
// ones, before the request leaves Chrome.
import { createServer } from 'node:http'
import { chromium } from 'patchright'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { startMitmProxy } from './mitm-proxy.mjs'

const PORT = process.env.PORT || 8080
const SECRET = process.env.SIDECAR_SECRET || ''
const PROXY_URL = process.env.PROXY_URL || ''
const FETCH_TIMEOUT_MS = 20_000
const MAX_REDIRECTS = 10

// Real Chrome's UA with "Headless" stripped — see header comment above.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'

let ipProbe = { checked: false }

async function fetchIp(withProxy) {
  try {
    const opts = withProxy && PROXY_URL ? { dispatcher: new ProxyAgent(PROXY_URL) } : {}
    const res = await Promise.race([
      undiciFetch('https://api.ipify.org', opts),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8_000)),
    ])
    return (await res.text()).trim()
  } catch {
    return null
  }
}

async function probeIps() {
  const [serverIp, proxyIp] = await Promise.all([fetchIp(false), fetchIp(true)])
  ipProbe = {
    checked: true,
    serverIp: serverIp ?? undefined,
    proxyIp: proxyIp ?? undefined,
    proxyOk: !!PROXY_URL && !!serverIp && !!proxyIp && serverIp !== proxyIp,
  }
  console.log('[sidecar] ip-probe:', JSON.stringify(ipProbe))
}

// Chrome/Playwright appears to handle authenticated (username/password)
// upstream proxies via its own internal CDP-level interception, which
// conflicts with our separate `Fetch.enable` below — the request stage
// fires fine, but the response-stage event never arrives, hanging forever.
// Confirmed empirically: the exact same request that resolves instantly
// with no proxy configured hangs indefinitely once a proxy with
// credentials is set, for any URL, not just specific sites.
//
// Fix: run a local MITM proxy (mitm-proxy.mjs) that itself holds the real
// upstream proxy credentials (as a plain Node process, not Chrome — no CDP
// conflict there) and forwards to it. Chrome connects to this local,
// unauthenticated proxy and never engages its own internal proxy-auth
// handling. The same proxy also corrects Sec-Fetch-* headers that Chrome
// recomputes from real request context regardless of our CDP overrides —
// see mitm-proxy.mjs for why that needs a real TLS-terminating layer rather
// than another CDP-level fix.
const { port: mitmPort } = await startMitmProxy(PROXY_URL || null)

const context = await chromium.launchPersistentContext('/tmp/chrome-profile', {
  channel: 'chrome',
  headless: true,
  userAgent: USER_AGENT,
  viewport: { width: 1920, height: 1080 },
  args: [
    '--no-sandbox', // required running as root in a container
    '--ignore-certificate-errors', // trust our local MITM proxy's self-signed certs
  ],
  proxy: { server: `http://127.0.0.1:${mitmPort}` },
})

// Each /fetch call gets its own page + CDP session, created and torn down
// per call (reused only across a single call's own redirect chain, which is
// sequential, never concurrent). This used to be one shared page for every
// call, correlated by a custom "x-sidecar-correlation-id" header injected
// into the in-page fetch() call — that was broken two ways:
//
//   1. Any custom header on a cross-origin fetch() forces a CORS preflight
//      (OPTIONS). Real upstreams (X, ipify, anything) don't grant CORS
//      permission for a made-up header, so the browser aborted the *real*
//      request after the preflight was rejected — only the doomed preflight
//      ever hit the network. The correlation Promise then just sat there
//      until our own timeout fired, which is exactly the "Upstream
//      unreachable" / request-canceled symptom seen in production.
//   2. `event.requestStage` (used to tell the pre-send pause from the
//      post-response pause) isn't actually a key on the Fetch.requestPaused
//      event in practice — confirmed empirically, not just per the CDP spec
//      docs. The reliable signal is whether `responseStatusCode` is present
//      on the event at all.
//
// Fix: don't add any custom header to the *trigger* fetch() (avoids the
// preflight for plain GET/POST entirely), and don't rely on requestStage —
// key off `'responseStatusCode' in event` instead. Header overrides
// (Origin/Referer/Cookie/whatever proxy.ts wants) still happen at
// Fetch.continueRequest, which is below the JS-level CORS decision, so
// overriding forbidden headers there doesn't retroactively trigger a
// preflight.
async function chromeFetchOnce(url, method, headersObj, bodyB64) {
  const t0 = Date.now()
  const page = await context.newPage()
  let sawAnyEvent = false
  try {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Fetch.enable', {
      patterns: [
        { urlPattern: '*', requestStage: 'Request' },
        { urlPattern: '*', requestStage: 'Response' },
      ],
    })

    return await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.error(
          `[sidecar] TIMEOUT after ${Date.now() - t0}ms url=${url} sawAnyEvent=${sawAnyEvent}`
        )
        reject(new Error('sidecar fetch timeout'))
      }, FETCH_TIMEOUT_MS)

      cdp.on('Fetch.requestPaused', async (event) => {
        sawAnyEvent = true
        const { requestId, responseStatusCode, responseHeaders, responseErrorReason } = event
        const isResponseStage = 'responseStatusCode' in event || responseErrorReason !== undefined

        if (!isResponseStage) {
          const headers = Object.entries(headersObj).map(([name, value]) => ({ name, value }))
          try {
            await cdp.send('Fetch.continueRequest', { requestId, headers })
          } catch (err) {
            console.error(`[sidecar] continueRequest (request stage) failed url=${url}:`, err.message)
          }
          return
        }

        clearTimeout(timeoutId)

        if (responseErrorReason) {
          console.error(`[sidecar] responseErrorReason url=${url}: ${responseErrorReason}`)
          await cdp.send('Fetch.continueRequest', { requestId }).catch((err) =>
            console.error(`[sidecar] continueRequest (error cleanup) failed url=${url}:`, err.message)
          )
          reject(new Error(`network error: ${responseErrorReason}`))
          return
        }

        let bodyB64Resp = ''
        try {
          const bodyResp = await cdp.send('Fetch.getResponseBody', { requestId })
          bodyB64Resp = bodyResp.base64Encoded ? bodyResp.body : Buffer.from(bodyResp.body, 'utf-8').toString('base64')
        } catch (err) {
          console.error(`[sidecar] getResponseBody failed url=${url} status=${responseStatusCode}:`, err.message)
        }

        try {
          await cdp.send('Fetch.continueRequest', { requestId })
        } catch (err) {
          console.error(`[sidecar] continueRequest (response stage) failed url=${url}:`, err.message)
        }
        console.log(`[sidecar] done url=${url} status=${responseStatusCode} ms=${Date.now() - t0}`)
        resolve({
          status: responseStatusCode,
          headers: (responseHeaders || []).map((h) => [h.name, h.value]),
          body: bodyB64Resp,
        })
      })

      // No custom headers here on purpose (see comment above) — the real
      // header set is applied above via Fetch.continueRequest instead.
      page
        .evaluate(
          ({ url, method, bodyB64 }) => {
            fetch(url, {
              method,
              redirect: 'manual',
              body: bodyB64 ? Uint8Array.from(atob(bodyB64), (c) => c.charCodeAt(0)) : undefined,
            }).catch(() => {})
          },
          { url, method, bodyB64 }
        )
        .catch((err) => console.error(`[sidecar] in-page evaluate() threw url=${url}:`, err.message))
    })
  } finally {
    await page.close().catch(() => {})
  }
}

/** Follow redirects ourselves (page fetch uses redirect:'manual') so callers always get the final response. */
async function chromeFetch(url, method, headersObj, bodyB64) {
  let currentUrl = url
  let currentBody = bodyB64
  let currentMethod = method
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const result = await chromeFetchOnce(currentUrl, currentMethod, headersObj, currentBody)
    if (result.status < 300 || result.status >= 400) return result
    const location = result.headers.find(([name]) => name.toLowerCase() === 'location')?.[1]
    if (!location) return result
    currentUrl = new URL(location, currentUrl).toString()
    // 303 always downgrades to GET; 301/302 downgrade POST to GET per widespread browser behavior
    if (result.status === 303 || ((result.status === 301 || result.status === 302) && currentMethod === 'POST')) {
      currentMethod = 'GET'
      currentBody = ''
    }
  }
  throw new Error('too many redirects')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, proxyActive: !!PROXY_URL, ipProbe }))
    return
  }

  if (req.url === '/fetch' && req.method === 'POST') {
    if (SECRET && req.headers.authorization !== `Bearer ${SECRET}`) {
      res.writeHead(401)
      res.end('unauthorized')
      return
    }

    try {
      const raw = await readBody(req)
      const body = JSON.parse(raw.toString('utf-8'))
      const headersObj = Object.fromEntries((body.headers || []).map(([k, v]) => [k, v]))
      console.log(`[sidecar] /fetch ${body.method} ${body.url} headerCount=${(body.headers || []).length}`)

      const result = await chromeFetch(body.url, body.method, headersObj, body.body || '')

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (err) {
      console.error(`[sidecar] /fetch failed:`, err instanceof Error ? err.stack || err.message : String(err))
      res.writeHead(502)
      res.end(`fetch error: ${err instanceof Error ? err.message : String(err)}`)
    }
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(PORT, () => {
  console.log(
    `[sidecar] listening :${PORT}  engine=chrome(patchright)  auth=${!!SECRET}  proxy=${!!PROXY_URL}`
  )
  probeIps()
})
