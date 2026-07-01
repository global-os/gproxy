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
 * Replace the upstream domain with the proxy host and downgrade SameSite=None.
 */
function rewriteSetCookie(setCookie: string, proxyHost: string): string {
  return setCookie
    .replace(/;\s*domain=[^;,]*/gi, `; Domain=${proxyHost}`)
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
 * Monkey-patches fetch() and XMLHttpRequest.open() so that cross-origin
 * requests to the bound domain (and its subdomains) are transparently
 * rerouted through the proxy before the site's own code runs.
 * Only the bound domain is intercepted — third-party widgets (Google Sign-In,
 * CDNs, etc.) are left alone so their own CORS/credentialing still works.
 */
function buildInterceptScript(boundDomain: string): string {
  const bd = JSON.stringify(boundDomain)
  return `<script>(function(){
var _o=location.origin,_bd=${bd};
function _p(u){
  try{
    var s=u instanceof Request?u.url:u instanceof URL?u.href:typeof u==='string'?u:null;
    if(!s||!s.startsWith('http')||s.startsWith(_o))return null;
    var r=new URL(s);
    if(r.hostname!==_bd&&!r.hostname.endsWith('.'+_bd))return null;
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
  const intercept = buildInterceptScript(boundDomain)
  // Inject as the first child of <head> so it runs before any site scripts.
  const injected = result.replace(/(<head[^>]*>)/i, `$1${intercept}`)
  if (injected !== result) return injected
  // No <head> tag — inject before the first <script>.
  return result.replace(/(<script[\s>])/i, `${intercept}$1`)
}

export async function proxyWebviewRequest(
  boundDomain: string,
  upstreamPath: string,
  incomingRequest: Request,
  proxyHost: string,
): Promise<Response> {
  const cross = extractCrossDomain(upstreamPath)
  const fetchDomain = cross ? cross.domain : boundDomain
  const fetchPath = cross ? cross.rest : upstreamPath

  const upstream = `https://${fetchDomain}${fetchPath}`

  const forwardHeaders = new Headers()
  for (const [key, value] of incomingRequest.headers.entries()) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) forwardHeaders.set(key, value)
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
  for (const [key, value] of upstreamResponse.headers.entries()) {
    const lower = key.toLowerCase()
    if (STRIP_RESPONSE_HEADERS.has(lower)) continue
    if (lower === 'set-cookie') {
      responseHeaders.append('Set-Cookie', rewriteSetCookie(value, proxyHost))
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
