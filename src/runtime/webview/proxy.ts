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

/** True if the first path segment looks like a proxied cross-domain hostname. */
function extractCrossDomain(upstreamPath: string): { domain: string; rest: string } | null {
  const m = upstreamPath.match(/^\/([a-z0-9][a-z0-9\-]*(?:\.[a-z0-9][a-z0-9\-]*){2,})(\/.*)?$/i)
  if (!m) return null
  return { domain: m[1]!, rest: m[2] || '/' }
}

// Headers that must not be forwarded to the upstream.
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade',
  // Set to the upstream host by the fetch() call itself.
  'host',
  // Proxy-domain cookies are meaningless to the upstream.
  'cookie',
  // We buffer the body, so let fetch() compute the correct length.
  'content-length',
])

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
 * Script injected at the top of every proxied HTML page.
 * Monkey-patches fetch() and XMLHttpRequest.open() to route ALL cross-origin
 * requests through the proxy. The proxy rewrites Origin/Referer to the bound
 * domain before forwarding, so third-party services (e.g. Google Sign-In)
 * see x.com as the caller rather than our proxy subdomain.
 */
function buildInterceptScript(): string {
  return `<script>(function(){
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

export async function proxyWebviewRequest(
  boundDomain: string,
  upstreamPath: string,
  incomingRequest: Request,
): Promise<Response> {
  // Cloudflare/CDN infrastructure paths — not real upstream content.
  if (upstreamPath.startsWith('/cdn-cgi/')) {
    return new Response('Not found', { status: 404 })
  }

  const cross = extractCrossDomain(upstreamPath)
  const fetchDomain = cross ? cross.domain : boundDomain
  const fetchPath = cross ? cross.rest : upstreamPath

  const upstream = `https://${fetchDomain}${fetchPath}`

  const boundOrigin = `https://${boundDomain}`
  const forwardHeaders = new Headers()
  for (const [key, value] of incomingRequest.headers.entries()) {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) continue
    // Present as the bound domain to all upstream services so third-party
    // integrations (e.g. Google Sign-In) see x.com rather than our proxy.
    if (lower === 'origin') { forwardHeaders.set('Origin', boundOrigin); continue }
    if (lower === 'referer') { forwardHeaders.set('Referer', boundOrigin + '/'); continue }
    forwardHeaders.set(key, value)
  }
  forwardHeaders.set(
    'User-Agent',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  )

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
    upstreamResponse = await fetch(upstream, {
      method: incomingRequest.method,
      headers: forwardHeaders,
      body,
      redirect: 'follow',
    })
  } catch (err) {
    console.error(`[webview] upstream fetch failed for ${upstream}:`, err)
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
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  }

  const html = await upstreamResponse.text()
  const rewritten = rewriteHtml(html, boundDomain)
  responseHeaders.set('Content-Type', 'text/html; charset=utf-8')
  responseHeaders.delete('content-length')

  return new Response(rewritten, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  })
}
