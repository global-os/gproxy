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

function stripCookieDomain(setCookie: string): string {
  return setCookie.replace(/;\s*domain=[^;,]*/gi, '')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Rewrite absolute URLs in HTML to route through the proxy. */
function rewriteHtml(html: string, boundDomain: string): string {
  const boundRe = new RegExp(escapeRegex(boundDomain), 'gi')

  return html.replace(
    /((?:src|href|action|srcset)=)(["'])(https?:\/\/[^"']+)\2/gi,
    (match, attr: string, quote: string, url: string) => {
      try {
        const parsed = new URL(url)
        const bare = parsed.pathname + parsed.search + parsed.hash
        if (boundRe.test(parsed.hostname)) {
          // Same-domain → relative path
          return `${attr}${quote}${bare}${quote}`
        }
        // Cross-domain → proxy via /{hostname}/path
        return `${attr}${quote}/${parsed.host}${bare}${quote}`
      } catch {
        return match
      }
    },
  )
}

export async function proxyWebviewRequest(
  boundDomain: string,
  upstreamPath: string,
  incomingRequest: Request,
): Promise<Response> {
  const cross = extractCrossDomain(upstreamPath)
  const fetchDomain = cross ? cross.domain : boundDomain
  const fetchPath = cross ? cross.rest : upstreamPath

  const upstream = `https://${fetchDomain}${fetchPath}`

  const forwardHeaders = new Headers()
  for (const h of ['accept', 'accept-language', 'accept-encoding', 'cache-control', 'if-none-match', 'if-modified-since']) {
    const v = incomingRequest.headers.get(h)
    if (v) forwardHeaders.set(h, v)
  }
  forwardHeaders.set(
    'User-Agent',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  )

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstream, {
      method: incomingRequest.method,
      headers: forwardHeaders,
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
      responseHeaders.append('Set-Cookie', stripCookieDomain(value))
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
