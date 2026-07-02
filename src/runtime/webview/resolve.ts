import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import * as schema from '../../db/schema.js'

export type WebviewRow = { id: number; slug: string; domain: string }

const cache = new Map<string, WebviewRow | null>()

export async function resolveWebviewBySlug(slug: string): Promise<WebviewRow | null> {
  if (cache.has(slug)) return cache.get(slug)!

  const [row] = await db
    .select({ id: schema.webview.id, slug: schema.webview.slug, domain: schema.webview.domain })
    .from(schema.webview)
    .where(eq(schema.webview.slug, slug))
    .limit(1)

  const result = row ?? null
  cache.set(slug, result)
  return result
}

export function evictWebviewCache(slug: string): void {
  cache.delete(slug)
}
