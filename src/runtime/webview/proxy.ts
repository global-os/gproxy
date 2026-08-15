import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { brotliDecompress } from 'node:zlib'
import { promisify } from 'node:util'
import { eq } from 'drizzle-orm'
import { getDomain } from 'tldts'
import { db } from '../../db/index.js'
import * as schema from '../../db/schema.js'
import { buildInterceptScript } from './intercept-script.js'
import { applyAppends, applyOriginRewrites, type WebviewRule } from './rules.js'
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

// What Chromium actually put on the wire for a sidecar-driven fetch, captured
// via CDP Network.requestWillBeSent / requestWillBeSentExtraInfo. headers are
// the final sent headers (after Fetch.continueRequest and Chrome's own
// recomputation of Sec-Fetch-*); priority/initialPriority reflect the request
// priority Chromium assigned (net::RequestPriority mapped to ResourcePriority).
type SidecarWireInfo = {
  url?: string
  method?: string
  priority?: string | null
  initialPriority?: string | null
  postData?: string | null
  headers?: Record<string, string>
}

async function fetchViaSidecar(
  upstream: string,
  init: SidecarFetchInit
): Promise<{ response: Response; wire: SidecarWireInfo | null }> {
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

  // Hard timeout on the sidecar round-trip. Two things this has to cover:
  //  (a) a genuinely hung Chrome fetch must fail (502) before Vercel's 30s cap
  //      reaps it as a 500, and
  //  (b) the sidecar's context pool QUEUES requests under a burst (bounded
  //      concurrency), so a request near the back of the queue legitimately
  //      waits before its fetch even starts — that wait must not be mistaken
  //      for a hang. 25s sits under the 30s cap while leaving room for the
  //      queued tail of a navigation-sized burst.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  const sidecarResp = await fetch(`${sidecarUrl}/fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sidecarSecret ? { Authorization: `Bearer ${sidecarSecret}` } : {}),
    },
    body: JSON.stringify({ url: upstream, method: init.method, headers, body }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))

  if (!sidecarResp.ok) {
    throw new Error(
      `sidecar ${sidecarResp.status}: ${await sidecarResp.text()}`
    )
  }

  const data = (await sidecarResp.json()) as {
    status: number
    headers: [string, string][]
    body: string
    wire?: SidecarWireInfo | null
  }

  const responseHeaders = new Headers()
  for (const [name, value] of data.headers) {
    responseHeaders.append(name, value)
  }

  return {
    response: new Response(Buffer.from(data.body, 'base64'), {
      status: data.status,
      headers: responseHeaders,
    }),
    wire: data.wire ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare challenge clearance
//
// Cloudflare's managed challenge mints a `cf_clearance` cookie only after a
// browser *genuinely* solves its JS proof-of-work. We cannot produce that cookie
// by faking headers or reimplementing the script in Node — the challenge is
// designed to detect exactly that. Instead the sidecar runs the challenge in a
// throwaway, isolated Chrome context (a real `goto()`, not a fetch) and hands
// back the resulting `cf_clearance` value. All the proxy does is cache that
// value and inject it into the outgoing Cookie header for the bound domain and
// its subdomains. See sidecar/server.mjs → solveCloudflareChallenge.
// ─────────────────────────────────────────────────────────────────────────────

// domain -> { cookie, at }: cache of solved clearances. cf_clearance is
// short-lived and IP-bound, so this is a short TTL cache, not a permanent one.
const cfClearanceCache = new Map<string, { cookie: string; at: number }>()
const CF_CLEARANCE_TTL_MS = 5 * 60 * 1000

/**
 * Fetch (or retrieve from cache) a solved cf_clearance cookie for `domain`.
 * Returns the ready-to-inject header fragment (`cf_clearance=<value>`) or null
 * if no sidecar is configured or the solve failed.
 */
async function getCfClearance(domain: string): Promise<string | null> {
  const cached = cfClearanceCache.get(domain)
  if (cached && Date.now() - cached.at < CF_CLEARANCE_TTL_MS) {
    return cached.cookie
  }

  if (!sidecarUrl) return null

  // Give the solve a bounded lifetime; a hung sidecar must not stall the
  // request past Vercel's cap (the sidecar already self-limits to 15s).
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  try {
    const res = await fetch(`${sidecarUrl}/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sidecarSecret ? { Authorization: `Bearer ${sidecarSecret}` } : {}),
      },
      body: JSON.stringify({ domain }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { cfClearance?: string | null }
    const value = data.cfClearance || null
    if (value) {
      const cookie = `cf_clearance=${value}`
      cfClearanceCache.set(domain, { cookie, at: Date.now() })
      return cookie
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/** Drop a stale cached clearance so the next request re-solves. */
function evictCfClearance(domain: string): void {
  cfClearanceCache.delete(domain)
}

/**
 * True if the upstream response is a Cloudflare challenge. Cloudflare tags
 * challenge responses with `cf-mitigated: challenge` (or `managed_challenge`);
 * the body is a JS challenge we can't solve on the fetch path, so we detect the
 * header and re-solve instead.
 */
function isCloudflareChallenge(res: Response): boolean {
  const mitigated = res.headers.get('cf-mitigated') ?? ''
  return res.status === 403 && mitigated.includes('challenge')
}

/**
 * Append a solved cf_clearance to `forwardHeaders` when the target is the bound
 * domain or one of its subdomains (same registrable domain). Returns true if a
 * clearance was attached. No-op for unrelated domains (e.g. abs.twimg.com) or
 * when the sidecar isn't configured.
 */
async function attachCloudflareClearance(
  forwardHeaders: Headers,
  boundDomain: string,
  fetchDomain: string
): Promise<boolean> {
  if (!sidecarUrl) return false
  const sameSite =
    fetchDomain === boundDomain || isSameSite(fetchDomain, boundDomain)
  if (!sameSite) return false

  const clearance = await getCfClearance(boundDomain)
  if (!clearance) return false

  // Fold the clearance into whatever cookie line the browser already sent (the
  // incoming request's own cookies for the proxy subdomain, e.g. gt/cuid/g_state)
  // rather than replacing it.
  const existing = forwardHeaders.get('cookie') ?? ''
  forwardHeaders.set(
    'Cookie',
    existing ? `${existing}; ${clearance}` : clearance
  )
  return true
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

  // Pass the mode/dest through from the inbound request — these describe the
  // request itself (a background fetch() → empty/cors) and the browser already
  // computes them correctly for its same-origin request to our proxy subdomain.
  const mode = incomingRequest.headers.get('sec-fetch-mode')
  const dest = incomingRequest.headers.get('sec-fetch-dest')
  if (mode) headers['Sec-Fetch-Mode'] = mode
  if (dest) headers['Sec-Fetch-Dest'] = dest
  const user = incomingRequest.headers.get('sec-fetch-user')
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
        ? fetchViaSidecar(url, fetchInit).then((v) => v.response)
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

// Flatten the sidecar's captured wire request (plain-object headers) into the
// recorder's header-array shape, tagging the Chromium-assigned priority as
// synthetic entries so it's visible in the exported HAR alongside the headers.
function wireHeadersToArray(
  wire: SidecarWireInfo
): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = []
  for (const [name, value] of Object.entries(wire.headers ?? {})) {
    out.push({ name, value: String(value) })
  }
  if (wire.priority != null) {
    out.push({ name: 'x-gproxy-wire-priority', value: String(wire.priority) })
  }
  if (wire.initialPriority != null) {
    out.push({
      name: 'x-gproxy-wire-initial-priority',
      value: String(wire.initialPriority),
    })
  }
  return out
}

/**
 * Castle.io is X's bot-detection SDK; its `$castle_token` is required by the
 * `begin_login` endpoint. Its chunk filename has drifted over time
 * (`ondemand.castle.<hex>.js` → `castle.umd-<hash>.js`), so match loosely by
 * the stable `castle.` prefix and `.js` suffix rather than any one exact form.
 */
const CASTLE_CHUNK_RE = /castle\.[A-Za-z0-9_-]+\.js$/i

/**
 * A known Castle build "version", identified by the *shape* of its minified
 * tamper-check functions rather than by its filename hash (which rotates every
 * deploy and can't be predicted). Castle's bundler renames these functions
 * arbitrarily between builds, so each entry pins one observed shape plus the
 * instrumentation that rewrites those checks to log what they return.
 *
 * When X ships a build whose shape matches none of these, the serving path logs
 * a loud "[castle] UNRECOGNIZED" error — add a new entry here for that shape.
 * Keep old entries: X may still serve an older build, and a shape-first registry
 * instruments whichever one actually arrives.
 */
interface CastleBuildVersion {
  /** Human-readable label used in logs when this build is matched. */
  name: string
  /** Identifies this build: matches one of its tamper-check functions. */
  fingerprint: RegExp
  /** Rewrites the whole script to add console logging to its tamper checks. */
  instrument: (script: string) => string
  /** Upstream Castle SDK version (npm `@castleio/castle-js`) this shape was
   *  observed in. Reference only — never used at runtime. */
  sdkVersion?: string
}

const CASTLE_BUILD_VERSIONS: CastleBuildVersion[] = [
  {
    // The shape observed in the original `ondemand.castle.<hex>.js` snapshot:
    // `function uN(){try{return EXPR}catch{return!1}}` — checks whether globals
    // like Element/AudioContext were monkey-patched via a .toString() compare.
    // Predates the fixtures/castle/ archive, so its SDK version is unknown.
    name: 'uN-try-return-v1',
    fingerprint:
      /function (u\d+)\(\)\{try\{return ([^;]{5,80}?)\}catch\{return!1\}\}/,
    instrument: (script) =>
      script.replace(
        /function (u\d+)\(\)\{try\{return ([^;]{5,80}?)\}catch\{return!1\}\}/g,
        (_m, name: string, expr: string) =>
          `function ${name}(){try{` +
          `var __v=(${expr});` +
          `console.log("[castle-probe] ${name} =",__v);` +
          `return __v` +
          `}catch(__e){console.log("[castle-probe] ${name} threw",__e&&__e.message);return!1}}`
      ),
  },
  {
    // The shape in the current `castle.umd-<hash>.js` build (captured
    // 2026-08-14, archived in fixtures/castle/castle.umd-BXTZcB1z.js and
    // castle.umd-Cs-TYKFF.js). Tamper checks are ANONYMOUS functions packed
    // into an array (`e[N]=function(){...}()`), with bodies like `return EXPR`,
    // `return!EXPR`, or `var e;return EXPR`.
    //
    // Identified as @castleio/castle-js v2.8.3 by deobfuscating the SDK's
    // string table and diffing Castle's font-fingerprint list across npm
    // versions: `Sitka` and `Candara` both appear here, and they only coexist
    // in <=2.8.3 (2.8.4 dropped `Candara`, 2.8.5 dropped `Sitka`). Reference
    // only — the fingerprint regex, not the version, is what selects a build.
    name: 'anonymous-try-return-v2',
    sdkVersion: '2.8.3',
    fingerprint: /function\(\)\{try\{([\s\S]{1,500}?)\}catch\{return!1\}\}/,
    instrument: (script) =>
      script.replace(
        /function\(\)\{try\{([\s\S]{1,500}?)\}catch\{return!1\}\}/g,
        (_m, body: string) => {
          const instrumented = body.replace(
            /^((?:var [\w$]+;)?)\s*return\s*([\s\S]+)$/,
            (_b, decl: string, expr: string) =>
              `${decl}var __v=(${expr});console.log("[castle-probe] =",__v);return __v`
          )
          return `function(){try{${instrumented}}catch(__e){console.log("[castle-probe] threw",__e&&__e.message);return!1}}`
        }
      ),
  },
]

/** Return the first known Castle build whose fingerprint matches `script`. */
function matchCastleBuild(script: string): CastleBuildVersion | null {
  for (const version of CASTLE_BUILD_VERSIONS) {
    if (version.fingerprint.test(script)) return version
  }
  return null
}

export async function proxyWebviewRequest(
  boundDomain: string,
  upstreamPath: string,
  incomingRequest: Request,
  slug = '',
  rules: WebviewRule[] = []
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
  let lastStatus: number | null = null
  let attempts = 0
  let wireRequest: SidecarWireInfo | null = null
  // Whether we've already evicted a stale clearance and re-solved for this
  // request. Guards against looping forever if the challenge never clears.
  let challengeRetried = false
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attempts = attempt
    try {
      if (sidecarUrl) {
        const via = await fetchViaSidecar(upstream, fetchInit)
        upstreamResponse = via.response
        wireRequest = via.wire
      } else if (outboundProxy) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upstreamResponse = (await undiciFetch(upstream, {
          ...fetchInit,
          dispatcher: outboundProxy,
        } as any)) as unknown as Response
      } else {
        upstreamResponse = await fetch(upstream, fetchInit)
      }
      lastStatus = upstreamResponse.status
      if (upstreamResponse.status < 500) {
        // Cloudflare challenged us: our cf_clearance is missing or stale. Evict
        // the cached clear, ask the sidecar to solve the challenge in its
        // isolated context, and retry once with the fresh cookie before giving
        // up and surfacing the challenge response as-is.
        if (
          isCloudflareChallenge(upstreamResponse) &&
          !challengeRetried
        ) {
          challengeRetried = true
          evictCfClearance(boundDomain)
          if (
            await attachCloudflareClearance(
              forwardHeaders,
              boundDomain,
              fetchDomain
            )
          ) {
            continue
          }
        }
        break
      }
      lastErr = new Error(`upstream returned ${upstreamResponse.status}`)
    } catch (err) {
      lastStatus = null
      lastErr = err
      // A hung sidecar fetch aborts with AbortError after the 15s timeout.
      // Retrying it would just hang again and blow past Vercel's 30s cap as a
      // 500 — fail fast as a 502 (the browser can retry) instead.
      if (err instanceof Error && err.name === 'AbortError') {
        console.log(`[webview] sidecar timeout, failing fast url=${upstream}`)
        break
      }
    }
    const givingUp = attempt === MAX_ATTEMPTS
    console.log(
      `[webview] upstream fetch ${givingUp ? 'failed (giving up)' : 'failed, retrying'} attempt=${attempt}/${MAX_ATTEMPTS} status=${lastStatus ?? 'error'} url=${upstream}: ` +
        (lastErr instanceof Error ? lastErr.message : String(lastErr))
    )
    if (givingUp) break
    await new Promise((resolve) => setTimeout(resolve, 150 * attempt))
  }

  // Prefer the sidecar's captured wire headers (what Chromium actually sent)
  // over the proxy's intended forwardHeaders when recording.
  const recordedRequestHeaders = wireRequest
    ? wireHeadersToArray(wireRequest)
    : headersToArray(forwardHeaders)

  if (!upstreamResponse) {
    console.error(`[webview] upstream fetch failed for ${upstream}:`, lastErr)
    if (sessionId != null) {
      recordTraffic({
        sessionId,
        slug,
        method,
        upstreamUrl: upstream,
        requestHeaders: recordedRequestHeaders,
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

  console.log(
    `[webview] upstream done url=${upstream} status=${upstreamResponse.status} attempts=${attempts} ms=${Date.now() - t0}`
  )

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

  const upstreamContentType = upstreamResponse.headers.get('content-type') ?? ''

  // Defensive: the sidecar occasionally returns a response with a missing or
  // wrong content-type (text/plain / octet-stream) for JS/CSS assets; combined
  // with the upstream's `x-content-type-options: nosniff` that blocks ES module
  // loading ("disallowed MIME type"). Derive the type from the path extension
  // and force it, so JS/CSS chunks always get a valid MIME type and also reach
  // the rewrite branches below (the JS branch fixes hardcoded CDN origins).
  const dot = fetchPath.lastIndexOf('.')
  const pathExt = dot >= 0 ? fetchPath.slice(dot).toLowerCase() : ''
  const missingOrPlain =
    !upstreamContentType ||
    /text\/plain|application\/octet-stream/i.test(upstreamContentType)
  if (
    (pathExt === '.js' || pathExt === '.mjs' || pathExt === '.cjs') &&
    missingOrPlain
  ) {
    responseHeaders.set('Content-Type', 'application/javascript; charset=utf-8')
  } else if (pathExt === '.css' && missingOrPlain) {
    responseHeaders.set('Content-Type', 'text/css; charset=utf-8')
  }

  const contentType = responseHeaders.get('content-type') ?? upstreamContentType
  const isHtml = contentType.includes('text/html')

  if (!isHtml) {
    // X's Sentry integration chunk (sentry-filter-*.js) is a SHARED bundle — the
    // entry chunk top-level-imports the i18n loader (r) and other helpers from
    // it, so it must NOT be blocked wholesale (that leaves the app stuck in its
    // skeleton, React never mounts). It was once blocked with a 404 on suspicion
    // of blanking the page, but the real cause was the split-brain module
    // double-load fixed by the origin rewrite below — so it's served as-is.

    // Rewrite CSS url() refs (fonts, images) to go through the proxy, then
    // apply any rewrite-origin rules.
    if (contentType.includes('text/css')) {
      const css = await upstreamResponse.text()
      const rewritten = applyOriginRewrites(
        rewriteCss(css, boundDomain),
        rules,
        fetchDomain,
        fetchPath
      )
      responseHeaders.delete('content-length')
      return new Response(rewritten, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      })
    }

    // JS chunk bodies can hardcode the CDN origin in string literals
    // (modulepreload URLs, font refs, …). Left absolute, those bypass the proxy
    // entirely: chunks are fetched a second time straight from the CDN (two
    // module instances — split-brain — that break the app). rewrite-origin rules
    // rewrite the origin to a proxy-relative path so everything routes through
    // the proxy.
    if (contentType.includes('javascript')) {
      const realScript = await upstreamResponse.text()
      const rewritten = applyOriginRewrites(
        realScript,
        rules,
        fetchDomain,
        fetchPath
      )

      // Castle.io (X's bot-detection SDK, ondemand.castle.*.js) used to be
      // intercepted here and fully stubbed out (every module body replaced
      // with a no-op) because it was reported to crash in the cross-origin
      // iframe context — but that also meant it never generates the
      // $castle_token X's begin_login endpoint expects, which is the likely
      // actual cause of the "Please use X.com or official X apps" login
      // error, and the crash it worked around didn't reproduce in repeated
      // local testing. Now served as-is (below), with one addition: its
      // environment-tampering checks get instrumented with a console.log so
      // real occurrences of the login-limit error can be correlated against
      // what these checks actually see — see CASTLE_TOKEN.md.
      //
      // Guardrail: Castle's chunk name and minified shape drift between builds.
      // If a known build's fingerprint matches, instrument it; if NONE match,
      // serve it raw but scream in the logs so the stale registry is impossible
      // to miss and we go add a new CASTLE_BUILD_VERSIONS entry.
      let output = rewritten
      if (CASTLE_CHUNK_RE.test(upstreamPath)) {
        const version = matchCastleBuild(rewritten)
        if (version) {
          console.log(`[castle] instrumenting build ${version.name} (${upstreamPath})`)
          output = version.instrument(rewritten)
        } else {
          console.error(
            `[castle] UNRECOGNIZED Castle build ${upstreamPath} — add a new entry to CASTLE_BUILD_VERSIONS in proxy.ts`
          )
        }
      }

      responseHeaders.delete('content-length')
      if (sessionId != null) {
        recordTraffic({
          sessionId,
          slug,
          method,
          upstreamUrl: upstream,
          requestHeaders: recordedRequestHeaders,
          requestBody: body ? Buffer.from(body).toString('base64') : null,
          responseStatus: upstreamResponse.status,
          responseHeaders: headersToArray(responseHeaders),
          responseBody: output.slice(0, 512 * 1024),
          responseBodyEncoding: null,
          durationMs: Date.now() - t0,
        })
      }
      return new Response(output, {
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
        requestHeaders: recordedRequestHeaders,
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
  const originRewritten = applyOriginRewrites(
    html,
    rules,
    fetchDomain,
    fetchPath
  )
  const rewritten = applyAppends(
    cross ? originRewritten : rewriteHtml(originRewritten, boundDomain),
    rules,
    fetchDomain,
    fetchPath
  )
  responseHeaders.set('Content-Type', 'text/html; charset=utf-8')
  responseHeaders.delete('content-length')
  if (sessionId != null) {
    recordTraffic({
      sessionId,
      slug,
      method,
      upstreamUrl: upstream,
      requestHeaders: recordedRequestHeaders,
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
