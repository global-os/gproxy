import { parse as acornParse } from 'acorn'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { getActiveSessionId, captureResponseBody, recordTraffic } from './recording.js'

let outboundProxy: ProxyAgent | null = null
if (process.env.PROXY_URL) {
  try {
    outboundProxy = new ProxyAgent(process.env.PROXY_URL)
    console.log('[webview] outbound proxy active:', process.env.PROXY_URL.replace(/:([^@]+)@/, ':***@'))
  } catch (err) {
    console.error('[webview] PROXY_URL is invalid, outbound proxy disabled:', err)
  }
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
  'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx',
  'css', 'scss', 'less',
  'php', 'html', 'htm', 'xml',
  'json', 'yaml', 'yml',
  'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'avif',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'map', 'gz', 'br', 'zip',
])

/** True if the first path segment looks like a proxied cross-domain hostname. */
function extractCrossDomain(upstreamPath: string): { domain: string; rest: string } | null {
  // Require 2+ dot-separated labels (covers x.com, api.x.com, abs.twimg.com, etc.)
  const m = upstreamPath.match(/^\/([a-z0-9][a-z0-9\-]*(?:\.[a-z0-9][a-z0-9\-]*){1,})(\/.*)?$/i)
  if (!m) return null
  const candidate = m[1]!
  const labels = candidate.split('.')
  const tld = labels[labels.length - 1]!.toLowerCase()
  // Last label must be purely alphabetic (rejects 1.1, v4i0.We4, etc.)
  if (!/^[a-z]{2,}$/i.test(tld)) return null
  // Last label must not be a file extension masquerading as a TLD (rejects rsrc.php, api.js, etc.)
  if (FILE_EXT_TLDS.has(tld)) return null
  // Reject if any label is a minified-filename hex hash (e.g. a1954c7a, 542e285a).
  if (labels.some(l => /^[0-9a-f]{6,16}$/i.test(l))) return null
  return { domain: candidate, rest: m[2] || '/' }
}

// Headers that must not be forwarded to the upstream.
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade',
  // Set to the upstream host by the fetch() call itself.
  'host',
  // We buffer the body, so let fetch() compute the correct length.
  'content-length',
  // Browser security metadata that reveals the cross-origin iframe context
  // to the upstream. Sites like X use these to detect proxy/WebView access
  // and serve error pages instead of normal content.
  'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user',
  'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
  'sec-ch-ua-arch', 'sec-ch-ua-bitness', 'sec-ch-ua-full-version',
  'sec-ch-ua-full-version-list', 'sec-ch-ua-model', 'sec-ch-ua-wow64',
  'sec-ch-prefers-color-scheme', 'sec-ch-prefers-reduced-motion',
  'sec-ch-viewport-width', 'sec-ch-width',
  // Vercel infrastructure headers injected into every inbound request.
  // These reveal our deployment identity and proxy chain to upstream services,
  // which is exactly how X detected us ("Please use X.com or official X apps").
  'forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
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
      `${attr}${quote}${rewriteUrl(url, boundRe)}${quote}`,
  )
}

/**
 * Script injected at the top of every proxied HTML page. Two sections:
 *
 * REPLACEMENTS — intercept platform APIs and change what they do so that
 * cross-origin network requests are transparently rerouted through the proxy.
 * The proxy rewrites Origin/Referer server-side so upstream services see the
 * bound domain (e.g. x.com) rather than our proxy subdomain.
 *
 * SHIMS — restore behaviour the site expects on its real domain that breaks
 * in the proxy context. These don't change intent; they fix the mismatch
 * between where the site thinks it's running and where it actually is.
 */
function buildInterceptScript(): string {
  return `<script>(function(){

/* ── REPLACEMENTS ─────────────────────────────────────────────────────── */

var _o=location.origin;
function _p(u){
  try{
    var s=u instanceof Request?u.url:u instanceof URL?u.href:typeof u==='string'?u:null;
    if(!s||!s.startsWith('http')||s.startsWith(_o))return null;
    var r=new URL(s);
    return '/'+r.host+r.pathname+r.search+r.hash;
  }catch(e){return null;}
}
var _f=window.fetch.bind(window);
window.fetch=function(input,init){
  var rw=_p(input);
  if(rw!==null)input=input instanceof Request?new Request(rw,input):rw;
  return _f(input,init);
};
var _xo=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){
  var rw=_p(typeof u==='string'?u:String(u));
  arguments[1]=rw!==null?rw:u;
  return _xo.apply(this,arguments);
};
var _sb=navigator.sendBeacon.bind(navigator);
navigator.sendBeacon=function(u,d){
  var rw=_p(typeof u==='string'?u:String(u));
  return _sb(rw!==null?rw:u,d);
};

/* ── SHIMS ────────────────────────────────────────────────────────────── */

// document.cookie: strip Domain= so cookies land on the proxy host instead
// of the site's real domain, which the browser would reject.
try{
  var _cd=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
  if(_cd&&_cd.set){
    var _cs=_cd.set;
    Object.defineProperty(document,'cookie',{configurable:true,get:_cd.get,set:function(v){
      _cs.call(document,String(v).replace(/;\\s*domain=[^;,]*/gi,''));
    }});
  }
}catch(e){}

// Intercept dynamically injected <script> src so cross-origin script loads
// are routed through the proxy just like fetch/XHR.
try{
  var _sd=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
  if(_sd&&_sd.set){var _ss=_sd.set;Object.defineProperty(HTMLScriptElement.prototype,'src',{get:_sd.get,set:function(v){var rw=_p(typeof v==='string'?v:String(v));_ss.call(this,rw!==null?rw:v);},configurable:true});}
}catch(e){}

})()</script>`
}

function rewriteHtml(html: string, boundDomain: string): string {
  let result = rewriteHtmlAttrs(html, boundDomain)
  // Strip <meta http-equiv="Content-Security-Policy"> tags — they would block
  // our injected inline script the same way HTTP CSP headers do.
  result = result.replace(/<meta[^>]+http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi, '')
  // Inject as the first child of <head> so it runs before any site scripts.
  const intercept = buildInterceptScript()
  const injected = result.replace(/(<head[^>]*>)/i, `$1${intercept}`)
  if (injected !== result) return injected
  // No <head> tag — inject before the first <script>.
  return result.replace(/(<script[\s>])/i, `${intercept}$1`)
}

/**
 * Parse a webpack chunk script and return a no-op stub that preserves the
 * chunk registration so webpack doesn't throw ChunkLoadError, but replaces
 * every module body with an empty function.
 *
 * Handles UMD wrappers where the webpack push is inside an IIFE and the
 * global/module map may be accessed via a local variable — we walk the AST
 * rather than executing the script or relying on regex.
 */
function extractWebpackChunkStub(script: string): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type ASTNode = Record<string, any>

  let ast: ASTNode
  try {
    ast = acornParse(script, { ecmaVersion: 'latest', sourceType: 'script' }) as unknown as ASTNode
  } catch (err) {
    console.log('[castle] acorn parse failed:', err instanceof Error ? err.message.slice(0, 120) : String(err))
    return null
  }

  // Generic depth-first walker — visits every node once.
  function walk(node: unknown, visit: (n: ASTNode) => void) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(n => walk(n, visit)); return }
    const n = node as ASTNode
    if (n.type) visit(n)
    for (const val of Object.values(n)) walk(val, visit)
  }

  // Castle finds the webpack chunk array by iterating window properties at
  // runtime rather than using the name as a literal — so acorn won't see it in
  // the push call. The name DOES appear verbatim somewhere in the script body
  // (module 164079's own code), so a plain regex is reliable here.
  const globalNameMatch = script.match(/(webpackChunk_[A-Za-z0-9_]+)/)
  let globalName = globalNameMatch?.[1] ?? ''
  let chunkIds: number[] = []
  let moduleIds: string[] = []

  walk(ast, (n) => {
    // Global name via AST as secondary signal (castle may not expose it this way).
    if (!globalName && n.type === 'Literal' && typeof n.value === 'string' && n.value.startsWith('webpackChunk_')) {
      globalName = n.value
    }

    // Module map: an ObjectExpression where every key is a large integer AND
    // every value is a function. This distinguishes the webpack module map
    // `{164079: function(e,t,r){...}}` from other numeric-keyed objects
    // (config tables, lookup maps, etc.) that castle includes in the same script.
    if (n.type === 'ObjectExpression' && n.properties?.length > 0 && moduleIds.length === 0) {
      const props = n.properties as ASTNode[]
      const allModuleLike = props.every(p => {
        const k = p.key as ASTNode
        const v = p.value as ASTNode
        const keyOk = (k?.type === 'Literal' && /^\d{4,}$/.test(String(k.value))) ||
                      (k?.type === 'Identifier' && /^\d{4,}$/.test(k.name as string))
        const valOk = v?.type === 'FunctionExpression' || v?.type === 'ArrowFunctionExpression'
        return keyOk && valOk
      })
      if (allModuleLike) {
        moduleIds = props.map(p => {
          const k = p.key as ASTNode
          return k.type === 'Literal' ? String(k.value) : k.name as string
        })
      }
    }

    // Chunk IDs: .push([[id, ...], moduleMapOrRef])
    if (
      n.type === 'CallExpression' &&
      n.callee?.type === 'MemberExpression' &&
      n.callee.property?.name === 'push' &&
      n.arguments?.length === 1 &&
      n.arguments[0]?.type === 'ArrayExpression' &&
      n.arguments[0].elements?.length === 2 &&
      n.arguments[0].elements[0]?.type === 'ArrayExpression'
    ) {
      chunkIds = (n.arguments[0].elements[0].elements as ASTNode[])
        .map((e: ASTNode) => (e?.type === 'Literal' && typeof e.value === 'number' ? e.value : null))
        .filter(Boolean) as number[]
    }
  })

  console.log('[castle] acorn extracted: globalName=', globalName || '(none)', 'chunkIds=', chunkIds, 'moduleIds=', moduleIds)
  if (!globalName || chunkIds.length === 0) return null

  const modules = moduleIds.length > 0
    ? moduleIds.map(id => `${id}:function(){}`).join(',')
    : '0:function(){}'

  return `(self["${globalName}"]=self["${globalName}"]||[]).push([[${chunkIds.join(',')}],{${modules}}])`
}

/** Probe a URL through the outbound proxy (if configured) — used by /debug. */
export async function probeOutboundProxy(url: string, timeoutMs = 8_000): Promise<{ ok: boolean; status?: number; ms: number; proxyActive: boolean; error?: string }> {
  const t = Date.now()
  try {
    const fetchInit = { redirect: 'follow' as const }
    const res = await Promise.race([
      outboundProxy
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (await undiciFetch(url, { ...fetchInit, dispatcher: outboundProxy } as any)) as unknown as Response
        : fetch(url, fetchInit),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ])
    return { ok: res.status < 500, status: res.status, ms: Date.now() - t, proxyActive: !!outboundProxy }
  } catch (err) {
    return { ok: false, ms: Date.now() - t, proxyActive: !!outboundProxy, error: err instanceof Error ? err.message : String(err) }
  }
}

function headersToArray(h: Headers): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = []
  h.forEach((value, name) => out.push({ name, value }))
  return out
}

export async function proxyWebviewRequest(
  boundDomain: string,
  upstreamPath: string,
  incomingRequest: Request,
  slug = '',
): Promise<Response> {

const t0 = Date.now()
const sessionId = await getActiveSessionId()
const cross = extractCrossDomain(upstreamPath)
  const fetchDomain = cross ? cross.domain : boundDomain
  const fetchPath = cross ? cross.rest : upstreamPath

  const upstream = `https://${fetchDomain}${fetchPath}`

  const boundOrigin = `https://${boundDomain}`
  const incomingCookie = incomingRequest.headers.get('cookie')
  console.log(`[webview] ${incomingRequest.method} ${upstream} cookies=${incomingCookie ? incomingCookie.split(';').length : 0}`)
  const forwardHeaders = new Headers()
  for (const [key, value] of incomingRequest.headers.entries()) {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) continue
    if (isVercelInternalHeader(lower)) continue
    // Present as the bound domain to all upstream services so third-party
    // integrations (e.g. Google Sign-In) see x.com rather than our proxy.
    if (lower === 'origin') { forwardHeaders.set('Origin', boundOrigin); continue }
    if (lower === 'referer') { forwardHeaders.set('Referer', boundOrigin + '/'); continue }
    // Drop the browser's Accept-Encoding so we can control it below.
    if (lower === 'accept-encoding') continue
    forwardHeaders.set(key, value)
  }
  forwardHeaders.set(
    'User-Agent',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  )
  // Request only encodings Node.js fetch auto-decodes (gzip, deflate).
  // Brotli (br) is NOT auto-decoded by undici/Node, so if we allowed it
  // upstream would send br-encoded bytes that we'd forward without decoding,
  // causing the browser to receive corrupted content.
  forwardHeaders.set('Accept-Encoding', 'gzip, deflate')

  const method = incomingRequest.method.toUpperCase()
  // Buffer the body rather than streaming — passing a ReadableStream to fetch()
  // requires the non-standard duplex:'half' option in Node.js and may fail on
  // Vercel. Buffering also lets fetch() set the correct Content-Length.
  let body: ArrayBuffer | null = null
  if (method !== 'GET' && method !== 'HEAD' && incomingRequest.body) {
    try { body = await incomingRequest.arrayBuffer() } catch { /* empty body */ }
  }

  let upstreamResponse: Response
  try {
    const fetchInit = {
      method: incomingRequest.method,
      headers: forwardHeaders,
      body,
      redirect: 'follow' as const,
    }
    upstreamResponse = outboundProxy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (await undiciFetch(upstream, { ...fetchInit, dispatcher: outboundProxy } as any)) as unknown as Response
      : await fetch(upstream, fetchInit)
  } catch (err) {
    console.error(`[webview] upstream fetch failed for ${upstream}:`, err)
    if (sessionId != null) {
      void recordTraffic({
        sessionId, slug, method, upstreamUrl: upstream,
        requestHeaders: headersToArray(forwardHeaders),
        requestBody: body ? Buffer.from(body).toString('base64') : null,
        responseStatus: 0,
        responseHeaders: [],
        responseBody: err instanceof Error ? err.message : String(err),
        responseBodyEncoding: null,
        durationMs: Date.now() - t0,
      })
    }
    return new Response('Upstream unreachable', { status: 502 })
  }

  const responseHeaders = new Headers()

  // getSetCookie() (undici / Node 18+) returns each Set-Cookie header as a
  // separate string, avoiding the comma-joining that headers.entries() can
  // produce, which corrupts cookie values that contain commas (e.g. expires).
  const setCookies: string[] =
    typeof (upstreamResponse.headers as unknown as { getSetCookie?(): string[] }).getSetCookie === 'function'
      ? (upstreamResponse.headers as unknown as { getSetCookie(): string[] }).getSetCookie()
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
    // Castle.io is X's bot-detection SDK. It crashes inside the proxy iframe
    // context (cross-origin parent access), which prevents login. We intercept
    // the chunk, preserve the webpack registration wrapper so the bundle doesn't
    // throw ChunkLoadError, but replace every module body with a no-op so the
    // fingerprinting code never runs.
    if (/castle\.[a-f0-9]+\.js$/.test(upstreamPath)) {
      const realScript = await upstreamResponse.text()
      const stub = extractWebpackChunkStub(realScript)
      console.log('[castle] stub:', stub ? stub.slice(0, 120) : 'none — returning real script')
      responseHeaders.set('Content-Type', 'application/javascript')
      responseHeaders.delete('content-length')
      const castleBody = stub ?? realScript
      if (sessionId != null) {
        void recordTraffic({
          sessionId, slug, method, upstreamUrl: upstream,
          requestHeaders: headersToArray(forwardHeaders),
          requestBody: body ? Buffer.from(body).toString('base64') : null,
          responseStatus: 200,
          responseHeaders: headersToArray(responseHeaders),
          responseBody: castleBody.slice(0, 512 * 1024),
          responseBodyEncoding: null,
          durationMs: Date.now() - t0,
        })
      }
      return new Response(castleBody, { status: 200, headers: responseHeaders })
    }

    if (sessionId != null) {
      const { body: buf, text: respText, encoding: respEncoding } = await captureResponseBody(upstreamResponse)
      void recordTraffic({
        sessionId, slug, method, upstreamUrl: upstream,
        requestHeaders: headersToArray(forwardHeaders),
        requestBody: body ? Buffer.from(body).toString('base64') : null,
        responseStatus: upstreamResponse.status,
        responseHeaders: headersToArray(responseHeaders),
        responseBody: respText,
        responseBodyEncoding: respEncoding,
        durationMs: Date.now() - t0,
      })
      responseHeaders.delete('content-length')
      return new Response(buf, { status: upstreamResponse.status, headers: responseHeaders })
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
    void recordTraffic({
      sessionId, slug, method, upstreamUrl: upstream,
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
