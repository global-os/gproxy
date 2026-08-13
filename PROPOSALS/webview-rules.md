# WebView response rules: configurable origin rewriting

## Status (2026-08-13)

`rewrite-origin` and `append` implemented end-to-end, plus a `path` matcher. More
matchers/actions from [`webviews.md`](./webviews.md) remain unimplemented. One
open problem: immutable upstream cache headers make proxy rewrites invisible to
returning visitors (see below).

## Problem

The proxy hardcoded a single X-specific rewrite in `proxyWebviewRequest` —
replacing `https://abs.twimg.com` with `/abs.twimg.com` in every JS chunk — to
stop X's chunks loading directly from the CDN. Left absolute, the CDN origin
inside JS chunk bodies (modulepreload URLs, font refs) made the browser fetch
each chunk a second time straight from `abs.twimg.com`, yielding two module
instances per chunk (split-brain) and a blank page. That rewrite was a per-site
special case baked into the proxy, not a config the `.gapp` owns.

The DB already had the generic surface for this — `webview_rule`
(per-webview `match`/`action` JSONB rows, ordered by `ord`) — but nothing read
or wrote it.

## What's implemented

- `src/runtime/webview/rules.ts` — `WebviewRule` type
  (`{ match: { domain?, path? }, action }`), a `parseWebviewRule` validator used
  on both the POST body and the DB JSONB, `ruleMatches`, `applyOriginRewrites`
  (literal `from` → `to` replacement), and `applyAppends` (inject an HTML
  snippet before `</body>`).
- `POST /api/webviews` accepts `rules: WebviewRule[]` and inserts `webview_rule`
  rows.
- `resolveWebviewBySlug` loads + caches rules (same cache-miss path, so the hot
  path stays off the DB — see the pool-exhaustion pitfall).
- `proxyWebviewRequest` evaluates `rewrite-origin` over HTML, CSS, and JS bodies,
  and `append` over HTML bodies.
- Kernel `webview:create` forwards `message.rules`.
- `twitter.gapp` sends the `abs.twimg.com` rewrite rule and a loading-screen
  `append` rule (`match: { path: '/' }`) instead of relying on the proxy.

### Actions

| Action | Shape | Applies to | Effect |
|--------|-------|-----------|--------|
| `rewrite-origin` | `{ from, to }` | HTML / CSS / JS | literal `from` → `to` replacement |
| `append` | `{ html }` | HTML | inject `html` before `</body>` |

The matcher/action shapes are JSONB, so more matchers (`prefix`, `regex`) and
actions (`block`, `remap`, …) from `webviews.md` can be added without a
migration — `parseWebviewRule` just rejects anything unrecognized today.

## Open problem: immutable upstream cache headers

The proxy rewrites JS/CSS/HTML content, but forwards the upstream's
`Cache-Control: max-age=31536000, immutable` (abs.twimg.com marks its hash-named
chunks immutable). A browser that cached a chunk before a proxy change keeps the
old bytes for a year, so a deployed rewrite only takes effect after a hard
refresh or cache eviction — the current twimg fix was invisible to returning
tabs until they hard-refreshed.

Options:

- Strip `immutable` (or cap `max-age`) on any response the proxy rewrites, so
  browsers revalidate with the upstream `ETag` and pick up new rewrite output.
- Add the proxy's own rewrite "version" to the cache key (query param or header)
  so rewritten content is cache-busted on deploy.
- Accept manual hard-refresh for now.

Not yet decided.
