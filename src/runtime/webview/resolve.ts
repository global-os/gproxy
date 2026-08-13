import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as schema from '../../db/schema.js'
import { parseWebviewRule, type WebviewRule } from './rules.js'

export type WebviewRow = {
  id: number
  slug: string
  domain: string
  rules: WebviewRule[]
}

const cache = new Map<string, WebviewRow | null>()

export async function resolveWebviewBySlug(
  slug: string
): Promise<WebviewRow | null> {
  if (cache.has(slug)) return cache.get(slug)!

  const [row] = await db
    .select({
      id: schema.webview.id,
      slug: schema.webview.slug,
      domain: schema.webview.domain,
    })
    .from(schema.webview)
    .where(eq(schema.webview.slug, slug))
    .limit(1)

  if (!row) {
    cache.set(slug, null)
    return null
  }

  const ruleRows = await db
    .select({
      match: schema.webviewRule.match,
      action: schema.webviewRule.action,
    })
    .from(schema.webviewRule)
    .where(eq(schema.webviewRule.webview_id, row.id))
    .orderBy(schema.webviewRule.ord)

  const rules = ruleRows
    .map((r) => parseWebviewRule({ match: r.match, action: r.action }))
    .filter((r): r is WebviewRule => r !== null)

  const result: WebviewRow = { ...row, rules }
  cache.set(slug, result)
  return result
}

export function evictWebviewCache(slug: string): void {
  cache.delete(slug)
}
