/**
 * Per-webview routing rules. A webview owns zero-or-more rules (stored as
 * `webview_rule` rows, evaluated in `ord` order). Each rule matches an upstream
 * domain and applies an action to the response body.
 *
 * Only one action is implemented so far: `rewrite-origin`, a content-level
 * string replacement that routes hardcoded CDN origins (e.g. `https://abs.twimg.com`
 * inside JS chunk bodies) through the proxy. The matcher/action shapes are
 * JSONB in the DB, so more matchers (path/prefix/regex) and actions (block,
 * remap, …) can be added without a migration — see PROPOSALS/webviews.md.
 */

export type WebviewRuleMatch = { domain: string }

export type WebviewRuleAction = {
  type: 'rewrite-origin'
  from: string
  to: string
}

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

  const domain = (match as Record<string, unknown>).domain
  const type = (action as Record<string, unknown>).type
  const from = (action as Record<string, unknown>).from
  const to = (action as Record<string, unknown>).to

  if (typeof domain !== 'string' || domain.length === 0) return null
  if (type !== 'rewrite-origin') return null
  if (typeof from !== 'string' || typeof to !== 'string') return null
  return { match: { domain }, action: { type, from, to } }
}

/**
 * Apply `rewrite-origin` rules to a response body. A rule applies when its
 * `match.domain` equals the upstream domain being fetched; the action replaces
 * every occurrence of `from` with `to` (literal, so no regex metacharacters).
 */
export function applyOriginRewrites(
  content: string,
  rules: WebviewRule[],
  fetchDomain: string
): string {
  let out = content
  for (const rule of rules) {
    if (
      rule.action.type === 'rewrite-origin' &&
      rule.match.domain === fetchDomain
    ) {
      out = out.split(rule.action.from).join(rule.action.to)
    }
  }
  return out
}
