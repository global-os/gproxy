import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { brotliDecompress } from 'node:zlib'
import { promisify } from 'node:util'
import { eq } from 'drizzle-orm'
import { getDomain } from 'tldts'
import { db } from '../../db/index.js'
import * as schema from '../../db/schema.js'
import { buildInterceptScript } from './intercept-script.js'
import {
  getActiveSessionId,
  captureResponseBody,
  recordTraffic,
} from './recording.js'

const brotliDecompressAsync = promisify(brotliDecompress)

function redactProxyUrl(url: string): string {
  return url.replace(/:([^@]+)@/, ':***@')
}

// No env var, single source of truth: the same DB-backed proxy_config row
// the admin panel writes to and the sidecar polls (previously this read a
// separate, static PROXY_URL env var that only ever reflected whatever was
// set at last deploy — a real gap, since admin-panel changes never reached
// this path; see CLAUDE.md's "Vercel pitfall #6", now resolved by removing
// the env var entirely rather than trying to keep two sources in sync).
// Cached briefly to avoid a DB round trip on every proxied request; on a
// read failure, falls back to no proxy and retries sooner rather than
// caching the failure for the same TTL as a success.
const CACHE_TTL_MS = 30_000
const RETRY_TTL_MS = 5_000
let cachedProxyUrl: string | null = null
let cachedProxyAgent: ProxyAgent | null = null
let cacheExpiresAt = 0
let lastError: string | null = null

export async function resolveOutboundProxy(): Promise<{
  agent: ProxyAgent | null
  urlRedacted: string | null
  error: string | null
}> {
  if (Date.now() < cacheExpiresAt) {
    return {
      agent: cachedProxyAgent,
      urlRedacted: cachedProxyUrl ? redactProxyUrl(cachedProxyUrl) : null,
      error: lastError,
    }
  }
  try {
    const [row] = await db
      .select()
      .from(schema.proxyConfig)
      .where(eq(schema.proxyConfig.id, 1))
    const url = row?.proxy_url || null
    if (url !== cachedProxyUrl) {
      cachedProxyAgent = url ? new ProxyAgent(url) : null
      cachedProxyUrl = url
      console.log(
        url
          ? `[webview] outbound proxy active: ${redactProxyUrl(url)}`
          : '[webview] outbound proxy disabled (no proxy_url in db)'
      )
    }
    lastError = null
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err)
    console.error(
      '[webview] failed to read proxy config from db, using no proxy until next check:',
      err
    )
    cachedProxyAgent = null
    cachedProxyUrl = null
    cacheExpiresAt = Date.now() + RETRY_TTL_MS
  }
  return {
    agent: cachedProxyAgent,
    urlRedacted: cachedProxyUrl ? redactProxyUrl(cachedProxyUrl) : null,
    error: lastError,
  }
}

/** Current outbound proxy URL (redacted), read live from the db — used by /debug. */
export async function getActiveOutboundProxyUrl(): Promise<string | null> {
  return (await resolveOutboundProxy()).urlRedacted
}

const sidecarUrl = process.env.SIDECAR_URL?.replace(/\/$/, '') ?? null
const sidecarSecret = process.env.SIDECAR_SECRET ?? null
if (sidecarUrl) {
  console.log('[webview] TLS sidecar active:', sidecarUrl)
}

type SidecarFetchInit = {
  method: string
  headers: Headers
  body: ArrayBuffer | null
  redirect: 'follow'
}

async function fetchViaSidecar(
  upstream: string,
  init: SidecarFetchInit
): Promise<Response> {
  const headers: [string, string][] = []
  init.headers.forEach((value, name) => {
    // Omit Accept-Encoding — Go's http client adds gzip and auto-decompresses,
    // so the sidecar always returns an already-decoded body with no Content-Encoding.
    if (name.toLowerCase() === 'accept-encoding') return
    headers.push([name, value])
  })

  const body =
    init.body && init.body.byteLength > 0
      ? Buffer.from(init.body).toString('base64')
      : ''

  const sidecarResp = await fetch(`${sidecarUrl}/fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sidecarSecret ? { Authorization: `Bearer ${sidecarSecret}` } : {}),
    },
    body: JSON.stringify({ url: upstream, method: init.method, headers, body }),
  })

  if (!sidecarResp.ok) {
    throw new Error(
      `sidecar ${sidecarResp.status}: ${await sidecarResp.text()}`
    )
  }

  const data = (await sidecarResp.json()) as {
    status: number
    headers: [string, string][]
    body: string
  }

  const responseHeaders = new Headers()
  for (const [name, value] of data.headers) {
    responseHeaders.append(name, value)
  }

  return new Response(Buffer.from(data.body, 'base64'), {
    status: data.status,
    headers: responseHeaders,
  })
}

const STRIP_RESPONSE_HEADERS = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'strict-transport-security',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'cross-origin-embedder-policy',
  // fetch() transparently decompresses the body based on this header, so
  // forwarding it as-is mislabels the already-decoded body we send back.
  'content-encoding',
  // Refers to the compressed upstream length; no longer matches the
  // decoded body we actually send.
  'content-length',
])

// Common file extensions that appear as path segments but are never real TLDs.
const FILE_EXT_TLDS = new Set([
  'js',
  'mjs',
  'cjs',
  'ts',
  'jsx',
  'tsx',
  'css',
  'scss',
  'less',
  'php',
  'html',
  'htm',
  'xml',
  'json',
  'yaml',
  'yml',
  'svg',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'ico',
  'avif',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'otf',
  'map',
  'gz',
  'br',
  'zip',
])

/** True if the first path segment looks like a proxied cross-domain hostname. */
function extractCrossDomain(
  upstreamPath: string
): { domain: string; rest: string } | null {
  // Require 2+ dot-separated labels (covers x.com, api.x.com, abs.twimg.com, etc.)
  const m = upstreamPath.match(
    /^\/([a-z0-9][a-z0-9\-]*(?:\.[a-z0-9][a-z0-9\-]*){1,})(\/.*)?$/i
  )
  if (!m) return null
  const candidate = m[1]!
  const labels = candidate.split('.')
  const tld = labels[labels.length - 1]!.toLowerCase()
  // Last label must be purely alphabetic (rejects 1.1, v4i0.We4, etc.)
  if (!/^[a-z]{2,}$/i.test(tld)) return null
  // Last label must not be a file extension masquerading as a TLD (rejects rsrc.php, api.js, etc.)
  if (FILE_EXT_TLDS.has(tld)) return null
  // Reject if any label is a minified-filename hex hash (e.g. a1954c7a, 542e285a).
  if (labels.some((l) => /^[0-9a-f]{6,16}$/i.test(l))) return null
  return { domain: candidate, rest: m[2] || '/' }
}

// Public-suffix-list-aware eTLD+1 comparison (tldts) — correctly treats
// e.g. example.co.uk and evil.co.uk as different sites, unlike a naive
// last-two-labels split (.co.uk is a shared registry suffix, not a domain
// either party owns).
function isSameSite(a: string, b: string): boolean {
  const domainA = getDomain(a)
  const domainB = getDomain(b)
  return domainA !== null && domainA === domainB
}

/**
 * Computes Sec-Fetch-Site the way a real, non-proxied visit to `boundDomain`
 * would see it: same-origin for a request to the bound domain itself,
 * same-site for a same-registrable-domain resource (e.g. api.x.com from
 * x.com), cross-site otherwise (e.g. a cross-domain remap partner on an
 * unrelated domain, per the `cross` handling in proxyWebviewRequest).
 *
 * Sec-Fetch-Mode/-Dest/-User are taken from the incoming request as-is:
 * they describe the request itself (fetch/XHR/navigate, resource type, user
 * gesture), not the site relationship, and the real end-user's browser
 * already computes them correctly for its actual request to our proxy
 * origin — which, thanks to the REPLACEMENTS URL-rewriting, has the same
 * mode/dest/user-activation shape as the equivalent unproxied request would.
 *
 * Whether these survive intact all the way to the upstream depends on the
 * outbound path: undici/direct fetch send them as given, but the sidecar's
 * driven Chrome recomputes and overwrites them unless it's running the
 * patched Chromium build with PreserveOverriddenSecFetchHeaders enabled —
 * see PROPOSALS/custom-chromium-build.md and sidecar/server.mjs.
 */
function computeSecFetchHeaders(
  boundDomain: string,
  fetchDomain: string,
  incomingRequest: Request
): Record<string, string> {
  const site =
    fetchDomain === boundDomain
      ? 'same-origin'
      : isSameSite(fetchDomain, boundDomain)
        ? 'same-site'
        : 'cross-site'

  const headers: Record<string, string> = { 'Sec-Fetch-Site': site }

  const mode = incomingRequest.headers.get('sec-fetch-mode')
  const dest = incomingRequest.headers.get('sec-fetch-dest')
  const user = incomingRequest.headers.get('sec-fetch-user')
  if (mode) headers['Sec-Fetch-Mode'] = mode
  if (dest) headers['Sec-Fetch-Dest'] = dest
  if (user) headers['Sec-Fetch-User'] = user

  return headers
}

// Headers that must not be forwarded to the upstream.
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  // Set to the upstream host by the fetch() call itself.
  'host',
  // We buffer the body, so let fetch() compute the correct length.
  'content-length',
  // Browser security metadata that reveals the cross-origin iframe context
  // to the upstream. The incoming values reflect a same-origin request to
  // our own proxy subdomain (REPLACEMENTS rewrites all outgoing site JS
  // calls to relative paths), not a real visit to the bound domain, so they
  // can't be forwarded as-is — stripped here and replaced below with values
  // computed for the bound-domain relationship instead.
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-ch-ua-arch',
  'sec-ch-ua-bitness',
  'sec-ch-ua-full-version',
  'sec-ch-ua-full-version-list',
  'sec-ch-ua-model',
  'sec-ch-ua-wow64',
  'sec-ch-prefers-color-scheme',
  'sec-ch-prefers-reduced-motion',
  'sec-ch-viewport-width',
  'sec-ch-width',
  // Vercel infrastructure headers injected into every inbound request.
  // These reveal our deployment identity and proxy chain to upstream services,
  // which is exactly how X detected us ("Please use X.com or official X apps").
  'forwarded',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
])

// Vercel injects many x-vercel-* headers; strip all of them by prefix check
// rather than maintaining an exhaustive list.
function isVercelInternalHeader(name: string): boolean {
  return name.startsWith('x-vercel-')
}

/**
 * Rewrite Set-Cookie so the browser accepts it under the proxy origin.
 * Strip Domain entirely (browser defaults to the response host) and
 * downgrade SameSite=None which requires a cross-origin context we don't have.
 */
function rewriteSetCookie(setCookie: string): string {
  return setCookie
    .replace(/;\s*domain=[^;,]*/gi, '')
    .replace(/;\s*samesite=none/gi, '; SameSite=Lax')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rewriteUrl(url: string, boundRe: RegExp): string {
  try {
    const parsed = new URL(url)
    const bare = parsed.pathname + parsed.search + parsed.hash
    return boundRe.test(parsed.hostname) ? bare : `/${parsed.host}${bare}`
  } catch {
    return url
  }
}

/** Rewrite absolute URLs in HTML attributes to route through the proxy. */
function rewriteHtmlAttrs(html: string, boundDomain: string): string {
  const boundRe = new RegExp(escapeRegex(boundDomain), 'gi')
  return html.replace(
    /((?:src|href|action|srcset)=)(["'])(https?:\/\/[^"']+)\2/gi,
    (_match, attr: string, quote: string, url: string) =>
      `${attr}${quote}${rewriteUrl(url, boundRe)}${quote}`
  )
}

function rewriteHtml(html: string, boundDomain: string): string {
  let result = rewriteHtmlAttrs(html, boundDomain)
  // Strip <meta http-equiv="Content-Security-Policy"> tags — they would block
  // our injected inline script the same way HTTP CSP headers do.
  result = result.replace(
    /<meta[^>]+http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi,
    ''
  )
  // Inject as the first child of <head> so it runs before any site scripts.
  const intercept = buildInterceptScript(boundDomain)
  const injected = result.replace(/(<head[^>]*>)/i, `$1${intercept}`)
  if (injected !== result) return injected
  // No <head> tag — inject before the first <script>.
  return result.replace(/(<script[\s>])/i, `${intercept}$1`)
}

/**
 * Rewrite absolute `url(...)` references in CSS (e.g. @font-face src, images)
 * so they route through the proxy like every other asset. HTML attributes and
 * runtime fetch/XHR are already rewritten elsewhere, but CSS is a separate
 * surface the browser resolves directly — without this, fonts (Chirp-*) and
 * any CSS images hit abs.twimg.com cross-origin instead of the proxy.
 */
function rewriteCss(css: string, boundDomain: string): string {
  const boundRe = new RegExp(escapeRegex(boundDomain), 'gi')
  return css.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi,
    (match, quote: string, url: string) => {
      if (!/^https?:\/\//i.test(url)) return match
      return `url(${quote}${rewriteUrl(url, boundRe)}${quote})`
    }
  )
}

/** Probe a URL through the configured fetch path (sidecar → outboundProxy → direct) — used by /debug. */
export async function probeOutboundProxy(
  url: string,
  timeoutMs = 8_000
): Promise<{
  ok: boolean
  status?: number
  ms: number
  proxyActive: boolean
  sidecarActive: boolean
  error?: string
}> {
  const t = Date.now()
  const { agent: outboundProxy } = await resolveOutboundProxy()
  try {
    const fetchInit = {
      method: 'GET',
      headers: new Headers(),
      body: null,
      redirect: 'follow' as const,
    }
    const res = await Promise.race([
      sidecarUrl
        ? fetchViaSidecar(url, fetchInit)
        : outboundProxy
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((await undiciFetch(url, {
              redirect: 'follow',
              dispatcher: outboundProxy,
            } as any)) as unknown as Response)
          : fetch(url, { redirect: 'follow' }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      ),
    ])
    return {
      ok: res.status < 500,
      status: res.status,
      ms: Date.now() - t,
      proxyActive: !!outboundProxy,
      sidecarActive: !!sidecarUrl,
    }
  } catch (err) {
    return {
      ok: false,
      ms: Date.now() - t,
      proxyActive: !!outboundProxy,
      sidecarActive: !!sidecarUrl,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

function headersToArray(h: Headers): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = []
  h.forEach((value, name) => out.push({ name, value }))
  return out
}

/**
 * Wraps Castle.io's environment-tampering checks with a console.log of their
 * return value, so a real occurrence of the login-limit error can be
 * correlated against what these checks actually observed in that browser.
 * Matches the shape empirically found in one snapshot of the real script
 * (`function uN(){try{return EXPR}catch{return!1}}`, checking whether
 * globals like Element/AudioContext have been monkey-patched via a
 * .toString() signature comparison) — matched generically by shape, not by
 * the specific minified names found in that snapshot, since those are
 * arbitrary and could shift in a different build. No-op (returns the script
 * unchanged) if the shape doesn't match at all, e.g. if X ships a
 * differently-structured bundle later.
 */
function instrumentCastleTamperChecks(script: string): string {
  return script.replace(
    /function (u\d+)\(\)\{try\{return ([^;]{5,80}?)\}catch\{return!1\}\}/g,
    (_match, name: string, expr: string) =>
      `function ${name}(){try{` +
      `var __v=(${expr});` +
      `console.log("[castle-probe] ${name} =",__v);` +
      `return __v` +
      `}catch(__e){console.log("[castle-probe] ${name} threw",__e&&__e.message);return!1}}`
  )
}

export async function proxyWebviewRequest(
  boundDomain: string,
  upstreamPath: string,
  incomingRequest: Request,
  slug = ''
): Promise<Response> {
  const t0 = Date.now()
  const sessionId = await getActiveSessionId()
  const cross = extractCrossDomain(upstreamPath)
  const fetchDomain = cross ? cross.domain : boundDomain
  const fetchPath = cross ? cross.rest : upstreamPath

  const upstream = `https://${fetchDomain}${fetchPath}`

  const boundOrigin = `https://${boundDomain}`
  const incomingCookie = incomingRequest.headers.get('cookie')
  console.log(
    `[webview] ${incomingRequest.method} ${upstream} cookies=${incomingCookie ? incomingCookie.split(';').length : 0}`
  )
  const forwardHeaders = new Headers()
  for (const [key, value] of incomingRequest.headers.entries()) {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) continue
    if (isVercelInternalHeader(lower)) continue
    // Present as the bound domain to all upstream services so third-party
    // integrations (e.g. Google Sign-In) see x.com rather than our proxy.
    if (lower === 'origin') {
      forwardHeaders.set('Origin', boundOrigin)
      continue
    }
    if (lower === 'referer') {
      forwardHeaders.set('Referer', boundOrigin + '/')
      continue
    }
    // Drop the browser's Accept-Encoding so we can control it below.
    if (lower === 'accept-encoding') continue
    forwardHeaders.set(key, value)
  }
  forwardHeaders.set(
    'User-Agent',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
  )
  // Real Chrome sends these low-entropy client hints on every request; we
  // stripped the browser's own values above (they'd reveal the cross-origin
  // iframe context), so replace with values consistent with the User-Agent
  // and the sidecar's TLS profile. Their absence is a stronger bot signal
  // than TLS fingerprinting alone — Chrome never omits them.
  forwardHeaders.set(
    'sec-ch-ua',
    '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"'
  )
  forwardHeaders.set('sec-ch-ua-mobile', '?0')
  forwardHeaders.set('sec-ch-ua-platform', '"macOS"')
  // Sec-Fetch-Site/-Mode/-Dest/-User for the bound-domain relationship — see
  // computeSecFetchHeaders() for why these can't just be forwarded as-is.
  for (const [name, value] of Object.entries(
    computeSecFetchHeaders(boundDomain, fetchDomain, incomingRequest)
  )) {
    forwardHeaders.set(name, value)
  }
  // Match Chrome's Accept-Encoding for fingerprint compatibility.
  // We manually decompress br below if undici doesn't handle it automatically.
  forwardHeaders.set('Accept-Encoding', 'gzip, deflate, br, zstd')

  const method = incomingRequest.method.toUpperCase()
  // Buffer the body rather than streaming — passing a ReadableStream to fetch()
  // requires the non-standard duplex:'half' option in Node.js and may fail on
  // Vercel. Buffering also lets fetch() set the correct Content-Length.
  let body: ArrayBuffer | null = null
  if (method !== 'GET' && method !== 'HEAD' && incomingRequest.body) {
    try {
      body = await incomingRequest.arrayBuffer()
    } catch {
      /* empty body */
    }
  }

  const fetchInit = {
    method: incomingRequest.method,
    headers: forwardHeaders,
    body,
    redirect: 'follow' as const,
  }
  const { agent: outboundProxy } = await resolveOutboundProxy()

  // Transient fetch failures surface as 502s/errors to the browser: the TLS
  // sidecar intermittently drops chunk requests (net::ERR_FAILED), and the
  // upstream sometimes 5xxes. Retry a few times before giving up.
  const MAX_ATTEMPTS = 3
  let upstreamResponse: Response | undefined
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (sidecarUrl) {
        upstreamResponse = await fetchViaSidecar(upstream, fetchInit)
      } else if (outboundProxy) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upstreamResponse = (await undiciFetch(upstream, {
          ...fetchInit,
          dispatcher: outboundProxy,
        } as any)) as unknown as Response
      } else {
        upstreamResponse = await fetch(upstream, fetchInit)
      }
      if (upstreamResponse.status < 500) break
      lastErr = new Error(`upstream returned ${upstreamResponse.status}`)
    } catch (err) {
      lastErr = err
    }
    if (attempt < MAX_ATTEMPTS) {
      console.log(
        `[webview] upstream fetch failed (attempt ${attempt}/${MAX_ATTEMPTS}) for ${upstream}: ` +
          (lastErr instanceof Error ? lastErr.message : String(lastErr))
      )
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt))
    }
  }

  if (!upstreamResponse) {
    console.error(`[webview] upstream fetch failed for ${upstream}:`, lastErr)
    if (sessionId != null) {
      recordTraffic({
        sessionId,
        slug,
        method,
        upstreamUrl: upstream,
        requestHeaders: headersToArray(forwardHeaders),
        requestBody: body ? Buffer.from(body).toString('base64') : null,
        responseStatus: 0,
        responseHeaders: [],
        responseBody: lastErr instanceof Error ? lastErr.message : String(lastErr),
        responseBodyEncoding: null,
        durationMs: Date.now() - t0,
      })
    }
    return new Response('Upstream unreachable', { status: 502 })
  }

  // If undici didn't auto-decompress brotli (or zstd), do it manually so the
  // browser receives raw bytes. We strip content-encoding before forwarding
  // regardless, so the browser must always receive an already-decoded body.
  const rawEncoding = upstreamResponse.headers.get('content-encoding') ?? ''
  if (rawEncoding === 'br') {
    const compressed = Buffer.from(await upstreamResponse.arrayBuffer())
    const decompressed = await brotliDecompressAsync(compressed)
    upstreamResponse = new Response(decompressed, {
      status: upstreamResponse.status,
      headers: upstreamResponse.headers,
    })
  }

  const responseHeaders = new Headers()

  // getSetCookie() (undici / Node 18+) returns each Set-Cookie header as a
  // separate string, avoiding the comma-joining that headers.entries() can
  // produce, which corrupts cookie values that contain commas (e.g. expires).
  const setCookies: string[] =
    typeof (
      upstreamResponse.headers as unknown as { getSetCookie?(): string[] }
    ).getSetCookie === 'function'
      ? (
          upstreamResponse.headers as unknown as { getSetCookie(): string[] }
        ).getSetCookie()
      : []
  for (const raw of setCookies) {
    responseHeaders.append('Set-Cookie', rewriteSetCookie(raw))
  }

  for (const [key, value] of upstreamResponse.headers.entries()) {
    const lower = key.toLowerCase()
    if (STRIP_RESPONSE_HEADERS.has(lower)) continue
    if (lower === 'set-cookie') {
      // Handled above via getSetCookie(); skip to avoid double-setting.
      if (setCookies.length > 0) continue
      responseHeaders.append('Set-Cookie', rewriteSetCookie(value))
      continue
    }
    if (lower === 'transfer-encoding') continue
    responseHeaders.set(key, value)
  }

  const contentType = upstreamResponse.headers.get('content-type') ?? ''
  const isHtml = contentType.includes('text/html')

  if (!isHtml) {
    // X's Sentry integration chunk (sentry-filter-*.js) is a SHARED bundle — the
    // entry chunk top-level-imports the i18n loader (r) and other helpers from
    // it, so it must NOT be blocked wholesale (that leaves the app stuck in its
    // skeleton, React never mounts). Its kl/Ol functions recurse infinitely in
    // the proxied context (blanking the page); see CASTLE_TOKEN.md for the plan
    // to patch that recursion specifically rather than block the chunk.

    // Rewrite CSS url() refs (fonts, images) to go through the proxy.
    if (contentType.includes('text/css')) {
      const css = await upstreamResponse.text()
      responseHeaders.delete('content-length')
      return new Response(rewriteCss(css, boundDomain), {
        status: upstreamResponse.status,
        headers: responseHeaders,
      })
    }

    // Castle.io (X's bot-detection SDK, ondemand.castle.*.js) used to be
    // intercepted here and fully stubbed out (every module body replaced
    // with a no-op) because it was reported to crash in the cross-origin
    // iframe context — but that also meant it never generates the
    // $castle_token X's begin_login endpoint expects, which is the likely
    // actual cause of the "Please use X.com or official X apps" login
    // error, and the crash it worked around didn't reproduce in repeated
    // local testing. Now served as-is (below), with one addition: its
    // environment-tampering checks (functions shaped like
    // `function uN(){try{return EXPR}catch{return!1}}`, checking whether
    // globals like Element/AudioContext have been monkey-patched, via
    // .toString() signature comparison) get instrumented with a
    // console.log so real occurrences of the login-limit error can be
    // correlated against what these checks actually see — see
    // CASTLE_TOKEN.md. If it turns out to genuinely crash, patch the
    // specific thing that breaks, not the whole module again.
    if (/castle\.[a-f0-9]+\.js$/.test(upstreamPath)) {
      const realScript = await upstreamResponse.text()
      const instrumented = instrumentCastleTamperChecks(realScript)
      responseHeaders.delete('content-length')
      if (sessionId != null) {
        recordTraffic({
          sessionId,
          slug,
          method,
          upstreamUrl: upstream,
          requestHeaders: headersToArray(forwardHeaders),
          requestBody: body ? Buffer.from(body).toString('base64') : null,
          responseStatus: upstreamResponse.status,
          responseHeaders: headersToArray(responseHeaders),
          responseBody: instrumented.slice(0, 512 * 1024),
          responseBodyEncoding: null,
          durationMs: Date.now() - t0,
        })
      }
      return new Response(instrumented, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      })
    }

    if (sessionId != null) {
      const {
        body: buf,
        text: respText,
        encoding: respEncoding,
      } = await captureResponseBody(upstreamResponse)
      recordTraffic({
        sessionId,
        slug,
        method,
        upstreamUrl: upstream,
        requestHeaders: headersToArray(forwardHeaders),
        requestBody: body ? Buffer.from(body).toString('base64') : null,
        responseStatus: upstreamResponse.status,
        responseHeaders: headersToArray(responseHeaders),
        responseBody: respText,
        responseBodyEncoding: respEncoding,
        durationMs: Date.now() - t0,
      })
      responseHeaders.delete('content-length')
      return new Response(buf, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      })
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  }

  const html = await upstreamResponse.text()
  // Only inject the intercept script into same-domain pages. Cross-domain HTML
  // (e.g. a Facebook endpoint returning an error page) is consumed as a fetch
  // response body by site JS — injecting script tags corrupts JSON.parse calls.
  const rewritten = cross ? html : rewriteHtml(html, boundDomain)
  responseHeaders.set('Content-Type', 'text/html; charset=utf-8')
  responseHeaders.delete('content-length')
  if (sessionId != null) {
    recordTraffic({
      sessionId,
      slug,
      method,
      upstreamUrl: upstream,
      requestHeaders: headersToArray(forwardHeaders),
      requestBody: body ? Buffer.from(body).toString('base64') : null,
      responseStatus: upstreamResponse.status,
      responseHeaders: headersToArray(responseHeaders),
      responseBody: rewritten.slice(0, 512 * 1024),
      responseBodyEncoding: null,
      durationMs: Date.now() - t0,
    })
  }

  return new Response(rewritten, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  })
}
