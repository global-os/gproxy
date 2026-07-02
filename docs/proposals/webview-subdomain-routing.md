# Proposal: Subdomain-based cross-domain routing for webview proxy

## Problem

The current proxy uses path-based routing to forward cross-origin requests:

```
https://s5heqqbq.app.onetrueos.com/www.facebook.com/ig_xsite_user_info/
```

This requires a heuristic regex (`extractCrossDomain`) to distinguish a cross-domain path segment from a real path. It breaks down when:

- Sites fetch cross-origin JSON and get HTML error pages back with our injected `<script>` block
- Cookies set by cross-domain responses have no meaningful origin isolation
- The bound domain's intercept script patches `fetch()` to produce proxy-relative paths, which looks bizarre in the network tab and can confuse site JS that inspects `URL.pathname`

## Proposed approach

Assign each cross-domain host its own subdomain under the webview slug:

```
https://www.facebook.com.s5heqqbq.app.onetrueos.com/ig_xsite_user_info/
```

General pattern: `{upstream-host}.{webview-slug}.app.onetrueos.com`

The intercept script rewrites cross-origin URLs at the subdomain level instead of the path level:

```js
// current
https://www.facebook.com/ig_xsite_user_info/
→ /www.facebook.com/ig_xsite_user_info/

// proposed
https://www.facebook.com/ig_xsite_user_info/
→ https://www.facebook.com.s5heqqbq.app.onetrueos.com/ig_xsite_user_info/
```

The server receives a request at `www.facebook.com.s5heqqbq.app.onetrueos.com`, extracts the upstream host from the leftmost subdomain labels, and proxies to `https://www.facebook.com/ig_xsite_user_info/`.

## Benefits

- **No heuristic parsing** — the hostname structure is unambiguous; no regex needed to tell a proxied host from a real path
- **Proper origin isolation** — each upstream domain gets its own browser origin, so cookies, `localStorage`, and CORS behave correctly per domain
- **Intercept script is cleaner** — rewrites to full `https://` URLs rather than path-relative strings; site JS inspecting `location.origin` or response URLs sees something sensible
- **No injection into cross-domain HTML** — the current workaround (skip `rewriteHtml` for cross-domain responses) becomes unnecessary; each subdomain only serves one upstream host so the intercept script is only injected on the main slug

## Challenges

### Wildcard certificate depth

`*.app.onetrueos.com` covers one level (`s5heqqbq.app.onetrueos.com`). The proposed scheme requires two levels deep (`www.facebook.com.s5heqqbq.app.onetrueos.com`), which needs `*.*.app.onetrueos.com`. Standard CAs do not issue multi-level wildcard certs.

Options:
- Use a wildcard at `*.{webview-slug}.app.onetrueos.com` — requires issuing one cert per webview slug (impractical at scale)
- Use a single `*.app.onetrueos.com` wildcard and encode the upstream host differently in the subdomain, e.g. replacing dots with dashes: `www-facebook-com.s5heqqbq.app.onetrueos.com` (ambiguous if upstream host contains dashes)
- Use a fixed separator: `www.facebook.com--s5heqqbq.app.onetrueos.com` (double-dash unlikely in real hostnames)
- Terminate TLS at a layer that handles wildcard depth (e.g. Cloudflare with a proxied wildcard record), then route internally

### Vercel routing

Vercel's custom domain wildcard support is limited to one level (`*.app.onetrueos.com`). Deeper wildcards would require a separate reverse proxy (Cloudflare Worker, nginx) in front of Vercel to strip the upstream-host prefix and rewrite to the correct Vercel URL before it hits the function.

### Intercept script origin

The intercept script currently uses `location.origin` to identify same-origin requests. Under the new scheme, the main slug origin (`s5heqqbq.app.onetrueos.com`) and cross-domain origins (`www.facebook.com.s5heqqbq.app.onetrueos.com`) are different, so the check still works — but the script needs to know the full set of proxy subdomains to avoid re-rewriting already-proxied URLs.

## Open questions

- Which separator is safest for encoding dots in hostnames? (`--`, `__`, or another scheme)
- Does Cloudflare's wildcard proxying support two-level deep subdomains on a custom domain?
- Should cross-domain subdomains be ephemeral (derived from the slug at intercept time) or registered as webview rows in the DB?
