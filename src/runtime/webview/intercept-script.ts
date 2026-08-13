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
 *
 * Written as a human-readable template literal (not minified): it's only a few
 * KB and clarity matters more here than a couple saved bytes.
 */
export function buildInterceptScript(boundDomain: string): string {
  return `<script>(function () {
  var boundOrigin = 'https://${boundDomain}'

  /* ── REPLACEMENTS ──────────────────────────────────────────────── */

  var proxyOrigin = location.origin
  var proxyHost = location.host
  var boundHost = new URL(boundOrigin).host

  // Rewrite a cross-origin absolute URL to a proxy path, e.g.
  // https://api.x.com/foo -> /api.x.com/foo. Returns null for same-origin,
  // non-http, or unparseable URLs (left untouched).
  function proxyUrl(input) {
    try {
      var s = input instanceof Request
        ? input.url
        : input instanceof URL
          ? input.href
          : typeof input === 'string' ? input : null
      if (!s || !s.startsWith('http') || s.startsWith(proxyOrigin)) return null
      var r = new URL(s)
      return '/' + r.host + r.pathname + r.search + r.hash
    } catch (e) {
      return null
    }
  }

  // The site's own JS can read the real proxy subdomain (location.href,
  // document.referrer, etc. — genuine properties of the real browser tab, not
  // spoofable, see SHIMS below) and embed it in outgoing request bodies.
  // Rewrite any occurrence of the real origin/bare hostname back to the bound
  // domain before the request leaves the browser — this only touches what goes
  // over the wire, never location.* itself.
  function rewriteBody(body) {
    if (typeof body !== 'string') return body
    return body.split(proxyOrigin).join(boundOrigin).split(proxyHost).join(boundHost)
  }

  // X's Sentry SDK reports to sentry.io; its envelope POST is CORS-rejected in
  // this iframe context and the rejection cascades into a page teardown
  // (blank). Stub those requests out entirely — return a fake success so
  // Sentry thinks the event was delivered and its error handling never throws.
  function isSentryUrl(url) {
    try {
      return typeof url === 'string' && url.indexOf('sentry.io') > -1
    } catch (e) {
      return false
    }
  }

  var origFetch = window.fetch.bind(window)
  window.fetch = function (input, init) {
    var url = input instanceof Request ? input.url : typeof input === 'string' ? input : String(input)
    if (isSentryUrl(url)) {
      return Promise.resolve(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
    }
    var rewritten = proxyUrl(input)
    if (rewritten !== null) input = input instanceof Request ? new Request(rewritten, input) : rewritten
    if (init && typeof init.body === 'string') init = Object.assign({}, init, { body: rewriteBody(init.body) })
    return origFetch(input, init)
  }

  var origXhrOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url) {
    var urlStr = typeof url === 'string' ? url : String(url)
    var args = Array.prototype.slice.call(arguments)
    if (isSentryUrl(urlStr)) {
      // Point the XHR at an empty JSON data URL so it "succeeds" without a
      // real network request to sentry.io.
      args[1] = 'data:application/json,{}'
      return origXhrOpen.apply(this, args)
    }
    var rewritten = proxyUrl(urlStr)
    // Copy instead of mutating the arguments object — a second wrapper (e.g.
    // the site's own Sentry instrumentation) calls us via apply(), and
    // mutating the live arguments object there is a known footgun.
    args[1] = rewritten !== null ? rewritten : urlStr
    return origXhrOpen.apply(this, args)
  }

  var origXhrSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.send = function (body) {
    return origXhrSend.call(this, rewriteBody(body))
  }

  var origSendBeacon = navigator.sendBeacon.bind(navigator)
  navigator.sendBeacon = function (url, data) {
    var urlStr = typeof url === 'string' ? url : String(url)
    if (isSentryUrl(urlStr)) return true
    var rewritten = proxyUrl(urlStr)
    return origSendBeacon(rewritten !== null ? rewritten : urlStr, rewriteBody(data))
  }

  /* ── SHIMS ──────────────────────────────────────────────────────── */

  // document.cookie: strip Domain= so cookies land on the proxy host instead
  // of the site's real domain, which the browser would reject.
  try {
    var cookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
    if (cookieDescriptor && cookieDescriptor.set) {
      var cookieSetter = cookieDescriptor.set
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: cookieDescriptor.get,
        set: function (value) {
          cookieSetter.call(document, String(value).replace(/;\\s*domain=[^;,]*/gi, ''))
        },
      })
    }
  } catch (e) {}

  // Intercept dynamically-injected <script> src so cross-origin script loads
  // are routed through the proxy just like fetch/XHR.
  try {
    var srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src')
    if (srcDescriptor && srcDescriptor.set) {
      var srcSetter = srcDescriptor.set
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        configurable: true,
        get: srcDescriptor.get,
        set: function (value) {
          var rewritten = proxyUrl(typeof value === 'string' ? value : String(value))
          srcSetter.call(this, rewritten !== null ? rewritten : value)
        },
      })
    }
  } catch (e) {}

  // window.location CANNOT be shimmed — Object.defineProperty(location,
  // 'origin', ...) throws "Cannot redefine property: origin" in real Chrome.
  // location.origin/href/hostname/host/protocol are non-configurable by
  // design, so the site's own JS genuinely sees the real proxy subdomain.
  //
  // document.referrer is different — a regular configurable accessor on
  // Document.prototype — so it *can* be shimmed. Mask the proxy subdomain with
  // the bound origin, but only when there really was a referrer (a fresh load
  // should still report no referrer).
  try {
    var realReferrer = document.referrer
    Object.defineProperty(Document.prototype, 'referrer', {
      configurable: true,
      get: function () {
        return realReferrer ? boundOrigin + '/' : ''
      },
    })
  } catch (e) {}
})()</script>`
}
