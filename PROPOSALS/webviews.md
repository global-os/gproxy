# WebViews

A WebView is a proxied `<iframe>` that a `.gapp` app can embed to load external URLs through the GlobalOS backend. The backend fetches upstream pages, applies a per-WebView rule set to each response, and returns rewritten content.

## Origin

GlobalOS started as a domain-rewriting proxy (`index.js` → `src/replace.ts`). WebViews are that original vision expressed as a first-class platform primitive owned by a process.

## URL structure

WebViews share `*.app.onetrueos.com` with instances. The router checks `instances.slug` first, then `webviews.slug`. Slugs are short random strings (8–12 chars), not UUIDs — no collision in practice.

Each WebView is bound to an upstream domain at creation time. The proxy URL is path-only:

```
https://{webviewId}.app.onetrueos.com/some/page
```

The proxy looks up the WebView row to find the upstream domain, then fetches `https://{domain}/some/page`.

Cross-domain links are rewritten to point to the *target domain's own WebView* (if one is registered via a `remap` rule). Each domain gets its own slug and therefore its own subdomain and cookie jar:

```html
<!-- upstream -->  <a href="https://cdn.wellsfargo.com/logo.png">
<!-- rewritten --> <a href="https://salakfjds.app.onetrueos.com/logo.png">
```

This means root-relative paths in cross-domain resources resolve correctly — `salakfjds.app.onetrueos.com` is bound to `cdn.wellsfargo.com`, so `url('/fonts/roboto.woff')` in a stylesheet fetched through `salakfjds` correctly resolves to `cdn.wellsfargo.com/fonts/roboto.woff`.

If a cross-domain link has no `remap` rule, it is proxied through the current WebView with the domain as the first path segment (e.g. `r7kx2mqp.app.onetrueos.com/unexpected.com/path`). Root-relative paths in those resources will resolve against the wrong domain, but this is the fallback for domains the app hasn't explicitly mapped.

## Schema

```sql
webview (
  id         serial PRIMARY KEY,
  slug       text NOT NULL UNIQUE,   -- 8–12 char random string; becomes subdomain
  process_id integer NOT NULL → process(id) ON DELETE CASCADE,
  domain     text NOT NULL,          -- upstream domain this WebView is bound to
  created_at timestamp
)

webview_rule (
  id         serial PRIMARY KEY,
  webview_id integer NOT NULL → webview(id) ON DELETE CASCADE,
  ord        integer NOT NULL,       -- evaluation order; first match wins
  match      jsonb NOT NULL,
  action     jsonb NOT NULL
)
index on (webview_id, ord)
```

A request to an unknown slug gets a 404 — you cannot reach a WebView before it exists.

The bound `domain` is immutable — changing the domain would invalidate the cookie jar and break navigation state. Rules are mutable and can be updated at any time; the slug and cookie jar are preserved across rule changes.

## Rules

Each rule has a matcher and an action. Rules are evaluated in order; the first match wins per request.

```ts
type UrlMatcher =
  | { domain: string }   // any path under this hostname
  | { path: string }     // exact path (on the WebView's bound domain)
  | { prefix: string }   // path or URL starts with this string
  | { regex: string }    // full upstream URL tested against pattern

type RuleAction =
  | { type: "replace-body"; html: string }
    // Discard upstream response, return this HTML.
    // e.g. wellsfargo.com → "<html><body>hi bob</body></html>"

  | { type: "rewrite-links"; to: string }
    // Rewrite every <a href> to a fixed URL.
    // e.g. every link on google.com → "https://example.com"

  | { type: "rewrite-domain"; from: string; to: string }
    // Content-level: replace all domain references in the HTML response
    // (href, src, action, meta content, inline CSS urls) from `from` to `to`.
    // The content is still fetched from `from`; only the links in the output change.
    // The original feature from src/replace.ts.

  | { type: "remap"; domain: string; webviewId: string }
    // When a URL matching the matcher appears in proxied content, rewrite it to
    // point to a specific other WebView (which must already exist).
    // The successor to the original `domains` table: slug → { domain, webviewId }.
    // e.g. match: { domain: "bankofamerica.com" },
    //      remap → domain: "bankofamerica.com", webviewId: "abc123def4"
    // → links to bankofamerica.com route through abc123def4's proxy instead

  | { type: "block" }
    // Return empty 200. Useful for ads, trackers, unwanted subresources.
    // The default for any request with no matching rule is to proxy it through,
    // so block must be stated explicitly for domains you want to suppress.

  | { type: "passthrough" }
    // Explicit no-op. Lets a sub-path escape a broader domain rule.
```

Example rule set for a WebView bound to `wellsfargo.com`:

```json
[
  {
    "match": { "domain": "doubleclick.net" },
    "action": { "type": "block" }
  },
  {
    "match": { "domain": "bankofamerica.com" },
    "action": { "type": "remap", "domain": "bankofamerica.com", "webviewId": "abc123def4" }
  }
]
```

## Domain registry

A process maintains a named registry of domain bindings: `slug → { domain, webviewId }`. This is the direct successor to the original `domains` table — instead of mapping a slug to a cleartext domain, it maps a slug to a domain-plus-WebView pair.

```ts
// app → kernel
{ type: 'webview:create',       domain: string, rules: WebViewRule[] }
{ type: 'webview:update-rules', webviewId: string, rules: WebViewRule[] }
{ type: 'webview:destroy',      webviewId: string }
{ type: 'webview:bind',         slug: string, webviewId: string }
{ type: 'webview:unbind',       slug: string }
{ type: 'webview:resolve',      slug: string }

// kernel → app
{ type: 'webview:create:complete',       webviewId: string, domain: string, proxyOrigin: string }
{ type: 'webview:update-rules:complete', webviewId: string }
{ type: 'webview:resolve:complete',      slug: string, webviewId: string, domain: string, proxyOrigin: string }
```

The app can navigate by slug rather than raw ID:

```ts
{ type: 'webview:resolve', slug: 'wellsfargo' }
// → { webviewId: 'r7kx2mqp', domain: 'wellsfargo.com', proxyOrigin: 'https://r7kx2mqp.app.onetrueos.com' }
```

`remap` rules reference other WebViews by raw ID. The target WebView must already exist when a request triggers the rule — the process is responsible for creating all WebViews before wiring up cross-domain remap rules.

## Cookie isolation

Each WebView is its own subdomain, so the browser isolates cookies automatically — `r7kx2mqp.app.onetrueos.com` and `abc123.app.onetrueos.com` are distinct origins. Isolation is per-WebView, not per-process: two WebViews within the same process bound to the same upstream domain get entirely separate cookie jars.

The proxy must strip the `Domain` attribute from `Set-Cookie` headers so upstream domains don't attempt to set cookies on `.app.onetrueos.com`:

```
Set-Cookie: session=abc; Domain=wellsfargo.com; Path=/
→
Set-Cookie: session=abc; Path=/
```

## Download interception

The proxy inspects every response before forwarding. A response is a download candidate if:

- `Content-Disposition: attachment` is present, OR
- `Content-Type` is non-renderable (`application/octet-stream`, `application/zip`, `application/x-tar`, any MIME type the browser would save rather than display)

On a download hit: discard the body, return a minimal HTML page that fires a postMessage to the parent frame:

```js
window.parent.postMessage({
  type: 'webview:download',
  webviewId: 'r7kx2mqp',
  filename: 'report.pdf',  // from Content-Disposition filename=, or null
  mimeType: 'application/pdf',
  url: 'https://wellsfargo.com/report.pdf',
  size: 182400             // from Content-Length, or null
}, '*')
```

The app receives this, prompts the user, and can save via the `fs.saveDesktopFile` syscall (re-fetching through the proxy as a normal GET).

## Kernel message API — events from the WebView iframe

```ts
// webview iframe → app (window.parent.postMessage, cross-origin)
{ type: 'webview:download', webviewId, filename, mimeType, url, size }
{ type: 'webview:error',    webviewId, message }
```

The kernel validates that `webviewId` belongs to the sending process before forwarding any message.

## Real-world website compatibility

Modern websites actively resist being proxied. Several mechanisms will cause pages to break even when the proxy is working correctly:

**Content Security Policy (CSP).** A site can send a header like `Content-Security-Policy: default-src 'self'` that tells the browser to refuse to load any resource that didn't come from the original domain. Since our proxy serves everything from `*.app.onetrueos.com`, the browser will block scripts, images, and stylesheets that the site's own CSP doesn't whitelist. The proxy needs to strip or rewrite CSP headers from upstream responses — the original proxy code already did this (`responseHeaders.delete('content-security-policy')`).

**HSTS (HTTP Strict Transport Security).** Sites can tell the browser "never connect to me over HTTP, always use HTTPS, and remember this for a year." This is stored per-domain in the browser. It doesn't affect the proxy directly (we always use HTTPS upstream), but combined with HSTS preloading (where browsers ship with a built-in list of HTTPS-only domains) it means some sites are essentially impossible to proxy in certain browsers.

**Subresource Integrity (SRI).** Scripts and stylesheets can include a hash of their expected content: `<script integrity="sha256-abc123...">`. If the proxy modifies the response at all (e.g. rewriting URLs in a script), the hash no longer matches and the browser refuses to execute it.

**JavaScript origin checks.** JavaScript running inside the proxied page can read `window.location.hostname` and will see `r7kx2mqp.app.onetrueos.com` instead of `wellsfargo.com`. Sites that validate their own origin in JS (common in auth flows, payment forms, and anything using `postMessage`) will break or behave unexpectedly.

These are inherent to any web proxy, not specific to this design. For controlled use cases with known content (internal tools, simple public pages, sites you control), they're manageable. For arbitrary real-world sites, expect breakage.

## What is not in scope (yet)

- `rewrite-links` templates (`"to": "https://example.com?orig={href}"`) — literal URL only for now
- CSS/JS content rewriting — rules apply to HTML responses only; non-HTML passes through or gets blocked
- Per-WebView request headers (custom User-Agent, etc.) — could be a rule action later
- WebView-to-WebView communication
