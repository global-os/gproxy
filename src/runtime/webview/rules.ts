/**
 * Per-webview routing rules. A webview owns zero-or-more rules (stored as
 * `webview_rule` rows, evaluated in `ord` order). Each rule matches an upstream
 * request (domain and/or path) and applies an action to the response body.
 *
 * Actions implemented so far:
 * - `rewrite-origin`: content-level string replacement that routes hardcoded CDN
 *   origins (e.g. `https://abs.twimg.com` inside JS chunk bodies) through the
 *   proxy.
 * - `append`: inject an HTML snippet before `</body>` — e.g. a loading screen
 *   shown while a site's chunks are still fetching.
 *
 * The matcher/action shapes are JSONB in the DB, so more matchers
 * (prefix/regex) and actions (block, remap, …) can be added without a migration
 * — see PROPOSALS/webviews.md.
 */

export type WebviewRuleMatch = {
  /** Upstream hostname to match (e.g. `abs.twimg.com`). Omit to match any. */
  domain?: string
  /** Upstream pathname to match (e.g. `/`). Omit to match any. */
  path?: string
}

export type WebviewRuleAction =
  | { type: 'rewrite-origin'; from: string; to: string }
  | { type: 'append'; html: string }

export type WebviewRule = {
  match: WebviewRuleMatch
  action: WebviewRuleAction
}

/** Validate a rule from untrusted input (POST /api/webviews body, or DB JSONB). */
export function parseWebviewRule(input: unknown): WebviewRule | null {
  if (typeof input !== 'object' || input === null) return null
  const rule = input as Record<string, unknown>
  const match = rule.match
  const action = rule.action
  if (typeof match !== 'object' || match === null) return null
  if (typeof action !== 'object' || action === null) return null

  const m = match as Record<string, unknown>
  const domain = m.domain
  const path = m.path
  if (
    (domain !== undefined &&
      (typeof domain !== 'string' || domain.length === 0)) ||
    (path !== undefined && (typeof path !== 'string' || path.length === 0))
  ) {
    return null
  }
  if (domain === undefined && path === undefined) return null

  const a = action as Record<string, unknown>
  const type = a.type
  if (type === 'rewrite-origin') {
    const { from, to } = a
    if (typeof from !== 'string' || typeof to !== 'string') return null
    return { match: { domain, path }, action: { type, from, to } }
  }
  if (type === 'append') {
    const { html } = a
    if (typeof html !== 'string') return null
    return { match: { domain, path }, action: { type, html } }
  }
  return null
}

/** Whether a rule's match applies to the given upstream request. */
export function ruleMatches(
  match: WebviewRuleMatch,
  fetchDomain: string,
  fetchPath: string
): boolean {
  if (match.domain !== undefined && match.domain !== fetchDomain) return false
  if (match.path !== undefined && match.path !== fetchPath) return false
  return true
}

/**
 * Apply `rewrite-origin` rules to a response body. Each matching rule replaces
 * every occurrence of `from` with `to` (literal, so no regex metacharacters).
 */
export function applyOriginRewrites(
  content: string,
  rules: WebviewRule[],
  fetchDomain: string,
  fetchPath: string
): string {
  let out = content
  for (const rule of rules) {
    if (rule.action.type !== 'rewrite-origin') continue
    if (!ruleMatches(rule.match, fetchDomain, fetchPath)) continue
    out = out.split(rule.action.from).join(rule.action.to)
  }
  return out
}

/**
 * Apply `append` rules to an HTML response body, injecting each snippet before
 * `</body>` (or at the end when there is no body tag).
 */
export function applyAppends(
  html: string,
  rules: WebviewRule[],
  fetchDomain: string,
  fetchPath: string
): string {
  let out = html
  for (const rule of rules) {
    if (rule.action.type !== 'append') continue
    if (!ruleMatches(rule.match, fetchDomain, fetchPath)) continue
    const idx = out.toLowerCase().lastIndexOf('</body>')
    out =
      idx === -1
        ? out + rule.action.html
        : out.slice(0, idx) + rule.action.html + out.slice(idx)
  }
  return out
}
