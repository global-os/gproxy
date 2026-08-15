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
import { anonymizeProxy } from 'proxy-chain'
import { resolveProxyUrl, startConfigPolling } from './config.mjs'
import { resolveChromiumExecutable } from './chromium-artifact.mjs'

const PORT = process.env.PORT || 8080
const SECRET = process.env.SIDECAR_SECRET || ''
// Proxy URL comes exclusively from the admin panel (polled from Vercel, stored
// in /data/config.json) — see config.mjs. No env var fallback.
const PROXY_URL = resolveProxyUrl()
const FETCH_TIMEOUT_MS = 20_000
const MAX_REDIRECTS = 10
// Intermittent `network error: Failed` (net::ERR_FAILED) from the driven
// browser under concurrent load — retry a failed fetch a few times rather
// than surface a 502 to the caller on a transient drop.
const FETCH_ATTEMPTS = 3
const FETCH_RETRY_DELAY_MS = 250
// How long to wait for Cloudflare's invisible managed challenge to self-solve
// (proof-of-work + a self-submit) and drop a cf_clearance cookie before giving
// up. Kept under Vercel's 30s function cap so a solve + a re-fetch both fit.
const SOLVE_TIMEOUT_MS = 15_000
// Optional path to a custom-built Chromium binary (see PROPOSALS/custom-chromium-build.md).
// When set, the sidecar uses this binary instead of stock Google Chrome.
const CHROMIUM_EXECUTABLE_PATH = process.env.CHROMIUM_EXECUTABLE_PATH || null
// Optional git SHA of a chromium-fork CI build; when set, the sidecar
// downloads that artifact from MinIO at startup and launches it instead of
// stock Chrome. CHROMIUM_EXECUTABLE_PATH takes precedence over this.
const CHROMIUM_ARTIFACT_SHA = process.env.CHROMIUM_ARTIFACT_SHA || ''
// git SHA of the gproxy commit this image was built from (baked in by CI via
// --build-arg). Surfaced on the /admin page so the running image can be tied
// back to a source commit.
const SIDECAR_SHA = process.env.SIDECAR_SHA || ''

// Real Chrome's UA with "Headless" stripped — see header comment above.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'

let ipProbe = { checked: false }

async function fetchIp(withProxy) {
  try {
    const opts =
      withProxy && PROXY_URL ? { dispatcher: new ProxyAgent(PROXY_URL) } : {}
    const res = await Promise.race([
      undiciFetch('https://api.ipify.org', opts),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8_000)
      ),
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
// Fix: proxy-chain's anonymizeProxy() holds the real upstream proxy
// credentials itself (a plain Node process, not Chrome — no CDP conflict
// there) and forwards to it via a local, unauthenticated proxy. Chrome
// never engages its own internal proxy-auth handling.
//
// This used to also run through a local MITM proxy (mitm-proxy.mjs,
// removed) that additionally corrected Sec-Fetch-* headers Chrome
// recomputes from real request context regardless of our CDP overrides —
// but that correction required *terminating* Chrome's TLS connection and
// re-establishing a new one from Node's own TLS stack to the upstream,
// which produces a Node/OpenSSL TLS fingerprint instead of Chrome's, for
// the one connection this whole sidecar exists to keep genuinely
// Chrome-flavored. Confirmed empirically: a direct Chrome session through
// the exact same upstream IP (no MITM, no interception at all) reached a
// login flow that failed every time through the MITM'd pipeline. Wrong
// Sec-Fetch-Site is the smaller cost — anonymizeProxy() just tunnels the
// bytes through, no termination, so Chrome's real TLS handshake reaches
// the upstream untouched.
//
// Longer-term fix in progress instead of re-adding the MITM: a patch in
// the `chromium-fork` repo (services/network/sec_header_helpers.cc, behind
// the PreserveOverriddenSecFetchHeaders feature) makes Chrome's network
// stack leave Sec-Fetch-* alone when Fetch.continueRequest already set a
// value, so proxy.ts's computeSecFetchHeaders() output would survive
// without any TLS-terminating layer. See PROPOSALS/custom-chromium-build.md.
// The flag below is harmless but inert against stock `channel: 'chrome'` —
// unregistered feature names are silently ignored — until this sidecar
// launches the patched binary via `executablePath` instead. That swap, and
// the CI build/deploy pipeline to produce the binary, hasn't happened yet.
const anonymizedProxyUrl = PROXY_URL ? await anonymizeProxy(PROXY_URL) : null

// Resolve which Chromium to launch. Precedence: explicit executable path >
// MinIO artifact (downloaded at startup) > stock Google Chrome.
let chromiumExecutable = CHROMIUM_EXECUTABLE_PATH
let chromiumLibraryPath = ''
if (!chromiumExecutable && CHROMIUM_ARTIFACT_SHA) {
  const resolved = await resolveChromiumExecutable(CHROMIUM_ARTIFACT_SHA)
  chromiumExecutable = resolved.executablePath
  chromiumLibraryPath = resolved.libraryPath
}

// Launch the browser once, but give every /fetch its own non-persistent
// context (see chromeFetchOnce) so requests never share a cookie jar or other
// session state.
const browser = await chromium.launch({
  // Use a custom-built Chromium if one was resolved, otherwise fall back to
  // stock Google Chrome.
  ...(chromiumExecutable
    ? { executablePath: chromiumExecutable }
    : { channel: 'chrome' }),
  headless: true,
  // Component builds link against .so files living next to the binary;
  // add their dir to the loader path so the downloaded artifact resolves.
  ...(chromiumLibraryPath
    ? {
        env: {
          ...process.env,
          LD_LIBRARY_PATH:
            chromiumLibraryPath +
            (process.env.LD_LIBRARY_PATH
              ? ':' + process.env.LD_LIBRARY_PATH
              : ''),
        },
      }
    : {}),
  args: [
    '--no-sandbox', // required running as root in a container
    '--enable-features=PreserveOverriddenSecFetchHeaders',
  ],
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
// Bounded pool of pre-created (fresh, unused) browser contexts. Each /fetch
// takes a context from the pool and, when done, the context is CLOSED — never
// reused — and a brand-new one is created in the background to replace it. This
// keeps per-request isolation (each request gets an untouched context) while
// hiding the expensive newContext() latency behind pre-creation, and the fixed
// pool size caps concurrency: a request that finds the pool empty queues for a
// context (backpressure) instead of letting a burst of chunk requests thrash
// Chrome until fetches hang past the timeout.
const CONTEXT_POOL_SIZE = 8
const readyContexts = []   // fresh contexts sitting ready
const contextWaiters = []  // requests waiting for a context
let contextsOut = 0        // contexts currently in use
let refilling = false

function makeContext() {
  return browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
    ...(anonymizedProxyUrl ? { proxy: { server: anonymizedProxyUrl } } : {}),
  })
}

// Top the pool up to CONTEXT_POOL_SIZE in the background, handing each fresh
// context to a waiting request first, otherwise holding it ready.
function refillPool() {
  if (refilling) return
  refilling = true
  void (async () => {
    try {
      while (contextsOut + readyContexts.length < CONTEXT_POOL_SIZE) {
        const ctx = await makeContext()
        const waiter = contextWaiters.shift()
        if (waiter) {
          contextsOut++
          waiter(ctx)
        } else {
          readyContexts.push(ctx)
        }
      }
    } catch (err) {
      console.error(
        '[sidecar] context pool refill failed:',
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      refilling = false
    }
  })()
}

// Take a fresh context (from the pool, or wait for one to be created).
async function acquireContext() {
  if (readyContexts.length > 0) {
    contextsOut++
    return readyContexts.shift()
  }
  return new Promise((resolve) => {
    contextWaiters.push(resolve)
    refillPool()
  })
}

// Close a used context (never reuse) and replenish the pool.
function releaseContext(context) {
  contextsOut--
  void context.close().catch(() => {})
  refillPool()
}

// Pre-warm the pool at startup so the first burst doesn't pay newContext().
refillPool()

async function chromeFetchOnce(url, method, headersObj, bodyB64) {
  // Take a fresh context from the pre-warmed pool (waits if none ready). Each
  // request gets an untouched context and discards it when done — see the pool
  // comment above for why this beats letting a burst hit Chrome at once.
  const context = await acquireContext()
  const t0 = Date.now()
  try {
    const page = await context.newPage()
    let sawAnyEvent = false
    const cdp = await context.newCDPSession(page)
    await cdp.send('Fetch.enable', {
      patterns: [
        { urlPattern: '*', requestStage: 'Request' },
        { urlPattern: '*', requestStage: 'Response' },
      ],
    })

    // Capture the request Chromium actually puts on the wire — final headers
    // and request priority — not just what we asked for via Fetch.continueRequest.
    // Chrome recomputes Sec-Fetch-* and priority internally, so the CDP override
    // alone is not ground truth. requestWillBeSentExtraInfo fires after the
    // Fetch-domain override with the headers as actually sent.
    await cdp.send('Network.enable')
    let wireInfo = null
    cdp.on('Network.requestWillBeSent', (params) => {
      const req = params.request
      // Skip the blank page's own about:blank load; only the fetch() we launched.
      if (!/^https?:/.test(req.url)) return
      wireInfo = {
        requestId: params.requestId,
        url: req.url,
        method: req.method,
        priority: req.priority ?? null,
        initialPriority: req.initialPriority ?? null,
        postData: req.postData ?? null,
        headers: req.headers ?? {},
      }
    })
    cdp.on('Network.requestWillBeSentExtraInfo', (params) => {
      // Final headers as actually sent, after Fetch.continueRequest and Chrome's
      // own recomputation of Sec-Fetch-*/etc.
      if (wireInfo && params.requestId === wireInfo.requestId) {
        wireInfo.headers = params.headers ?? wireInfo.headers
      }
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
        const {
          requestId,
          responseStatusCode,
          responseHeaders,
          responseErrorReason,
        } = event
        const isResponseStage =
          'responseStatusCode' in event || responseErrorReason !== undefined

        if (!isResponseStage) {
          const headers = Object.entries(headersObj).map(([name, value]) => ({
            name,
            value,
          }))
          // Ask the custom Chromium (patched url_loader.cc) to treat this
          // request as a top-level navigation for priority purposes — Cloudflare
          // keys on the HTTP/2 priority, which header rewrites alone can't set.
          headers.push({ name: 'X-Gproxy-Navigation', value: '1' })
          try {
            await cdp.send('Fetch.continueRequest', { requestId, headers })
          } catch (err) {
            console.error(
              `[sidecar] continueRequest (request stage) failed url=${url}:`,
              err.message
            )
          }
          return
        }

        clearTimeout(timeoutId)

        if (responseErrorReason) {
          console.error(
            `[sidecar] responseErrorReason url=${url}: ${responseErrorReason}`
          )
          await cdp
            .send('Fetch.continueRequest', { requestId })
            .catch((err) =>
              console.error(
                `[sidecar] continueRequest (error cleanup) failed url=${url}:`,
                err.message
              )
            )
          reject(new Error(`network error: ${responseErrorReason}`))
          return
        }

        let bodyB64Resp = ''
        try {
          const bodyResp = await cdp.send('Fetch.getResponseBody', {
            requestId,
          })
          bodyB64Resp = bodyResp.base64Encoded
            ? bodyResp.body
            : Buffer.from(bodyResp.body, 'utf-8').toString('base64')
        } catch (err) {
          console.error(
            `[sidecar] getResponseBody failed url=${url} status=${responseStatusCode}:`,
            err.message
          )
        }

        try {
          await cdp.send('Fetch.continueRequest', { requestId })
        } catch (err) {
          console.error(
            `[sidecar] continueRequest (response stage) failed url=${url}:`,
            err.message
          )
        }
        console.log(
          `[sidecar] done url=${url} status=${responseStatusCode} ms=${Date.now() - t0}`
        )
        resolve({
          status: responseStatusCode,
          headers: (responseHeaders || []).map((h) => [h.name, h.value]),
          body: bodyB64Resp,
          wire: wireInfo,
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
              body: bodyB64
                ? Uint8Array.from(atob(bodyB64), (c) => c.charCodeAt(0))
                : undefined,
            }).catch(() => {})
          },
          { url, method, bodyB64 }
        )
        .catch((err) =>
          console.error(
            `[sidecar] in-page evaluate() threw url=${url}:`,
            err.message
          )
        )
    })
  } finally {
    // Close the context (never reuse it) and replenish the pool.
    releaseContext(context)
  }
}

/** Follow redirects ourselves (page fetch uses redirect:'manual') so callers always get the final response. */
async function chromeFetch(url, method, headersObj, bodyB64) {
  let currentUrl = url
  let currentBody = bodyB64
  let currentMethod = method
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const result = await chromeFetchOnce(
      currentUrl,
      currentMethod,
      headersObj,
      currentBody
    )
    if (result.status < 300 || result.status >= 400) return result
    const location = result.headers.find(
      ([name]) => name.toLowerCase() === 'location'
    )?.[1]
    if (!location) return result
    currentUrl = new URL(location, currentUrl).toString()
    // 303 always downgrades to GET; 301/302 downgrade POST to GET per widespread browser behavior
    if (
      result.status === 303 ||
      ((result.status === 301 || result.status === 302) &&
        currentMethod === 'POST')
    ) {
      currentMethod = 'GET'
      currentBody = ''
    }
  }
  throw new Error('too many redirects')
}

/**
 * chromeFetch with retries for transient network failures. Only "network
 * error: ..." (CDP responseErrorReason, i.e. net::ERR_FAILED and friends) is
 * retried — a timeout or too-many-redirects is a different problem and
 * retrying them just multiplies the wait.
 */
async function chromeFetchWithRetry(url, method, headersObj, bodyB64) {
  let lastErr
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
    try {
      return await chromeFetch(url, method, headersObj, bodyB64)
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      if (!/^network error:/.test(msg) || attempt === FETCH_ATTEMPTS) break
      const delay = FETCH_RETRY_DELAY_MS * attempt
      console.log(
        `[sidecar] fetch failed (attempt ${attempt}/${FETCH_ATTEMPTS}): ${msg} — retrying in ${delay}ms`
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}

/**
 * Solve Cloudflare's managed challenge for a domain and return the resulting
 * cf_clearance cookie value.
 *
 * WHY A SEPARATE, THROWAWAY CONTEXT:
 *   The challenge is a JS proof-of-work that can only run in a real browser
 *   engine — it fingerprints navigator/document/timing and interacts with
 *   Cloudflare's token service, so a Node-side reimplementation gets flagged.
 *   But it must NOT share ANY state with the per-request fetch contexts: the
 *   challenge's cookies/localStorage (or a half-solved challenge) would leak
 *   into proxied requests, and vice-versa. So we spin up a fresh, isolated
 *   context, let it genuinely navigate and solve, read out the ONE value we
 *   need (cf_clearance), then discard the whole context. The only thing that
 *   crosses this boundary is the cf_clearance string itself.
 *
 * WHY THE SAME PROXY:
 *   cf_clearance is bound to the exit IP. The solve and every subsequent fetch
 *   must egress through the same proxy IP, so the context reuses the same
 *   anonymized proxy the /fetch path already uses. If the proxy rotates IPs,
 *   the cached clear goes stale and the caller re-solves.
 *
 * @param {string} domain e.g. 'x.com'
 * @returns {Promise<{ ok: boolean, cfClearance: string | null }>}
 */
async function solveCloudflareChallenge(domain) {
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1920, height: 1080 },
    ...(anonymizedProxyUrl ? { proxy: { server: anonymizedProxyUrl } } : {}),
  })
  try {
    const page = await context.newPage()
    const target = `https://${domain}/`

    // Real navigation, not fetch(): the browser renders the challenge page,
    // runs its script, and the challenge self-solves + reloads. This is the
    // whole point of doing it in Chrome rather than in Node.
    await page
      .goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      .catch(() => {})

    // Poll the cookie jar for cf_clearance. The invisible challenge usually
    // solves in a few seconds; give it the full window before reporting failure.
    const deadline = Date.now() + SOLVE_TIMEOUT_MS
    let cfClearance = null
    while (Date.now() < deadline) {
      const cookies = await context.cookies(target).catch(() => [])
      const found = cookies.find((c) => c.name === 'cf_clearance')
      if (found) {
        cfClearance = found.value
        break
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    console.log(`[sidecar] /solve domain=${domain} solved=${!!cfClearance}`)
    return { ok: true, cfClearance }
  } catch (err) {
    console.error(
      '[sidecar] /solve failed:',
      err instanceof Error ? err.message : String(err)
    )
    return { ok: false, cfClearance: null }
  } finally {
    // Discard the context entirely: no cookies, storage, or challenge state
    // survive to pollute any other request's context.
    await context.close().catch(() => {})
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

// Accepts either the usual `Authorization: Bearer <secret>` header (used by
// the main app calling in programmatically) or a `?secret=` query param
// (used by the admin-panel link to this page, since a plain browser
// navigation can't set custom headers).
function isAuthorized(req, url) {
  if (!SECRET) return true
  if (req.headers.authorization === `Bearer ${SECRET}`) return true
  return url.searchParams.get('secret') === SECRET
}

function renderAdminPage() {
  const redactedProxyUrl = PROXY_URL
    ? PROXY_URL.replace(/:([^@]+)@/, ':***@')
    : '(none)'
  const chromiumBuild = chromiumExecutable
    ? CHROMIUM_ARTIFACT_SHA || chromiumExecutable
    : 'stock (channel: chrome)'
  const rows = [
    ['Sidecar image', SIDECAR_SHA || '(unknown)'],
    ['Chromium build', chromiumBuild],
    ['Proxy URL', redactedProxyUrl],
    ['Server IP', ipProbe.serverIp ?? '(unchecked)'],
    ['Proxy IP', ipProbe.proxyIp ?? '(unchecked)'],
    ['Proxy routing OK', String(ipProbe.proxyOk ?? false)],
    ['Uptime', `${Math.floor(process.uptime())}s`],
  ]
  const tableRows = rows
    .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
    .join('\n')
  return `<!DOCTYPE html>
<html><head><title>Sidecar admin</title>
<style>
  body { font-family: monospace; background: #111; color: #0f0; padding: 2em; }
  table { border-collapse: collapse; }
  th, td { text-align: left; padding: 0.3em 1em; border-bottom: 1px solid #333; }
  th { color: #6f6; }
</style></head>
<body>
<h1>Sidecar status</h1>
<table>${tableRows}</table>
</body></html>`
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, proxyActive: !!PROXY_URL, ipProbe }))
    return
  }

  if (url.pathname === '/admin' && req.method === 'GET') {
    if (!isAuthorized(req, url)) {
      res.writeHead(401)
      res.end('unauthorized')
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(renderAdminPage())
    return
  }

  if (url.pathname === '/fetch' && req.method === 'POST') {
    if (!isAuthorized(req, url)) {
      res.writeHead(401)
      res.end('unauthorized')
      return
    }

    try {
      const raw = await readBody(req)
      const body = JSON.parse(raw.toString('utf-8'))
      const headersObj = Object.fromEntries(
        (body.headers || []).map(([k, v]) => [k, v])
      )
      console.log(
        `[sidecar] /fetch ${body.method} ${body.url} headerCount=${(body.headers || []).length}`
      )

      const result = await chromeFetchWithRetry(
        body.url,
        body.method,
        headersObj,
        body.body || ''
      )

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (err) {
      console.error(
        `[sidecar] /fetch failed:`,
        err instanceof Error ? err.stack || err.message : String(err)
      )
      res.writeHead(502)
      res.end(
        `fetch error: ${err instanceof Error ? err.message : String(err)}`
      )
    }
    return
  }

  // Solve Cloudflare's managed challenge for a domain in a throwaway, isolated
  // Chrome context and return the cf_clearance cookie value. The main app
  // caches it and injects it into proxied requests to that domain.
  if (url.pathname === '/solve' && req.method === 'POST') {
    if (!isAuthorized(req, url)) {
      res.writeHead(401)
      res.end('unauthorized')
      return
    }

    try {
      const raw = await readBody(req)
      const body = JSON.parse(raw.toString('utf-8'))
      // Only accept a bare hostname (e.g. 'x.com'); never let a caller pass an
      // arbitrary path/URL into page.goto.
      const domain = String(body.domain || '')
        .trim()
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .replace(/[^a-z0-9.-]/gi, '')
      if (!domain || !domain.includes('.')) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: 'bad domain' }))
        return
      }

      const result = await solveCloudflareChallenge(domain)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        })
      )
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
  startConfigPolling()
})
